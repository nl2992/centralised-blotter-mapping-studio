#!/usr/bin/env node
/*
 * Automated regression harness for centralised_blotter_mapping_studio.html
 *
 * What it does:
 *   1. Serves the repo root over http (python3 -m http.server on a free port) so
 *      the app's CDN <script> tags (xlsx, highcharts, papaparse) and relative
 *      fetches behave the same as a real deployment (file:// breaks CDN + fetch).
 *   2. Launches headless Chromium via Playwright, forcing window.__SNAPSHOT_MODE
 *      = true before any app script executes (via addInitScript).
 *   3. For each scenario in tests/expected.js: navigates to the app, sets the
 *      illiquidStatusToBuySell / trsFxConvention selects (dispatching 'change'
 *      so the app rebuilds mapping), uploads ocr_work/test_non_linear_taxonomy.xlsx
 *      via the #workbookInput file input, clicks #btnParseWorkbook, waits for
 *      window.__BOARD_READY, then reads window.__BOARD_SNAPSHOT().
 *   4. Asserts every expected field per row and prints a PASS/FAIL report.
 *
 * Usage:
 *   cd tests && node run_tests.js
 * (requires `npm install` inside tests/ once beforehand to fetch Playwright +
 *  its Chromium binary; see docs/test_harness.md)
 *
 * Exit code is non-zero if any assertion fails.
 */
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { BASELINE, ILLIQUID_OFF, TRS_DIVIDE, ECONOMICS_TOKEN_CHECKS } = require("./expected");

const REPO_ROOT = path.resolve(__dirname, "..");
const APP_FILE = "centralised_blotter_mapping_studio.html";
const FIXTURE = path.join(REPO_ROOT, "ocr_work", "test_non_linear_taxonomy.xlsx");

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function startHttpServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(port)], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let resolved = false;
    const onData = (d) => {
      const s = d.toString();
      if (!resolved && /Serving HTTP/.test(s)) {
        resolved = true;
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", reject);
    // Fallback: python's http.server prints to stderr immediately; give it a
    // moment then assume it's up if the process hasn't exited.
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(proc);
      }
    }, 800);
  });
}

async function setSettingsAndParse(page, settings) {
  await page.waitForFunction(() => window.__BOARD_READY === true, null, { timeout: 15000 });

  // Settings now live in the "Settings" tab view. Set values directly on the controls and fire
  // change so the app re-maps; this works regardless of which tab is currently visible.
  await page.evaluate((s) => {
    const set = (id, val) => {
      const el = document.getElementById(id);
      el.value = val;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("illiquidStatusToBuySell", s.illiquidStatusToBuySell);
    set("trsFxConvention", s.trsFxConvention);
  }, settings);

  await page.setInputFiles("#workbookInput", FIXTURE);
  await page.click("#btnParseWorkbook");

  await page.waitForFunction(() => {
    return window.__BOARD_READY === true && Array.isArray(window.__BOARD_SNAPSHOT()) && window.__BOARD_SNAPSHOT().length > 0;
  }, null, { timeout: 20000 });

  // give React-less re-render a beat to settle pills/comments
  await page.waitForTimeout(150);
}

function fieldsEqual(actual, expected) {
  return String(actual === undefined || actual === null ? "" : actual) === String(expected);
}

function runScenarioChecks(scenarioName, snapshot, checks, results) {
  checks.forEach((check) => {
    const row = snapshot[check.index];
    if (!row) {
      results.push({ scenario: scenarioName, id: check.id, field: "(row presence)", pass: false, detail: `row index ${check.index} missing from snapshot (snapshot length ${snapshot.length})` });
      return;
    }
    Object.entries(check.expect || {}).forEach(([field, expectedValue]) => {
      const actualValue = row[field];
      const pass = fieldsEqual(actualValue, expectedValue);
      results.push({
        scenario: scenarioName,
        id: check.id,
        field,
        pass,
        detail: pass ? `${field}=${JSON.stringify(actualValue)}` : `${field} expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`
      });
    });
    (check.commentContains || []).forEach((token) => {
      const comment = row.comment || "";
      const pass = comment.includes(token);
      results.push({
        scenario: scenarioName,
        id: check.id,
        field: `comment contains "${token}"`,
        pass,
        detail: pass ? `found "${token}"` : `comment missing "${token}" (comment=${JSON.stringify(comment)})`
      });
    });
  });
}

function runTokenAnyOfChecks(scenarioName, snapshot, checks, results) {
  checks.forEach((check) => {
    const row = snapshot[check.index];
    if (!row) {
      results.push({ scenario: scenarioName, id: check.id, field: "(row presence)", pass: false, detail: `row index ${check.index} missing` });
      return;
    }
    const comment = row.comment || "";
    const found = check.tokensAnyOf.filter((t) => comment.includes(t));
    const pass = found.length > 0;
    results.push({
      scenario: scenarioName,
      id: check.id,
      field: `comment contains any of [${check.tokensAnyOf.join(", ")}]`,
      pass,
      detail: pass ? `found: ${found.join(", ")}` : `comment=${JSON.stringify(comment)}`
    });
  });
}

async function main() {
  const port = await findFreePort();
  console.log(`[harness] starting http server on 127.0.0.1:${port} (cwd=${REPO_ROOT})`);
  const serverProc = await startHttpServer(port);

  const results = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const appUrl = `http://127.0.0.1:${port}/${APP_FILE}`;

    // ---- Scenario 1: BASELINE settings ----
    {
      const context = await browser.newContext();
      await context.addInitScript(() => { window.__SNAPSHOT_MODE = true; });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(String(e)));
      await page.goto(appUrl, { waitUntil: "load" });
      await setSettingsAndParse(page, BASELINE.settings);
      const snapshot = await page.evaluate(() => window.__BOARD_SNAPSHOT());
      const pills = await page.evaluate(() => window.__BOARD_PILLS());
      console.log(`[harness] BASELINE snapshot rows=${snapshot.length} pills=${JSON.stringify(pills)}`);
      if (consoleErrors.length) console.log(`[harness] BASELINE page errors: ${consoleErrors.join(" | ")}`);
      runScenarioChecks("BASELINE", snapshot, BASELINE.checks, results);
      runTokenAnyOfChecks("BASELINE", snapshot, ECONOMICS_TOKEN_CHECKS, results);
      await context.close();
    }

    // ---- Scenario 2: illiquidStatusToBuySell = off ----
    {
      const context = await browser.newContext();
      await context.addInitScript(() => { window.__SNAPSHOT_MODE = true; });
      const page = await context.newPage();
      await page.goto(appUrl, { waitUntil: "load" });
      await setSettingsAndParse(page, ILLIQUID_OFF.settings);
      const snapshot = await page.evaluate(() => window.__BOARD_SNAPSHOT());
      console.log(`[harness] ILLIQUID_OFF snapshot rows=${snapshot.length}`);
      runScenarioChecks("ILLIQUID_OFF", snapshot, ILLIQUID_OFF.checks, results);
      await context.close();
    }

    // ---- Scenario 3: trsFxConvention = divide ----
    {
      const context = await browser.newContext();
      await context.addInitScript(() => { window.__SNAPSHOT_MODE = true; });
      const page = await context.newPage();
      await page.goto(appUrl, { waitUntil: "load" });
      await setSettingsAndParse(page, TRS_DIVIDE.settings);
      const snapshot = await page.evaluate(() => window.__BOARD_SNAPSHOT());
      console.log(`[harness] TRS_DIVIDE snapshot rows=${snapshot.length}`);
      runScenarioChecks("TRS_DIVIDE", snapshot, TRS_DIVIDE.checks, results);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    serverProc.kill();
  }

  // ---- Report ----
  console.log("\n==================== TEST REPORT ====================");
  let passCount = 0;
  let failCount = 0;
  results.forEach((r) => {
    const status = r.pass ? "PASS" : "FAIL";
    if (r.pass) passCount += 1; else failCount += 1;
    console.log(`[${status}] ${r.scenario} / ${r.id} / ${r.field} -- ${r.detail}`);
  });
  console.log("=======================================================");
  console.log(`TOTAL: ${results.length}  PASS: ${passCount}  FAIL: ${failCount}`);

  if (failCount > 0) {
    console.error(`\n${failCount} assertion(s) FAILED.`);
    process.exit(1);
  } else {
    console.log("\nAll assertions passed.");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("[harness] fatal error:", e);
  process.exit(1);
});
