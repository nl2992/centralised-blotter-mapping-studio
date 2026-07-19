#!/usr/bin/env node
/*
 * Header-signature template auto-detection harness for
 * centralised_blotter_mapping_studio.html.
 *
 * Sibling of run_tests.js / run_starred_field_matrix.js. Builds its OWN fixture
 * workbooks at runtime (via the `xlsx` package already vendored in
 * tests/node_modules) that put known column layouts under NON-STANDARD sheet
 * names, then drives the real app exactly like the other harnesses (same
 * python http.server + Playwright headless Chromium pattern) and asserts, via
 * window.__BOARD_SNAPSHOT() + window.__BOARD_SHEET_STATUS(), that:
 *
 *   (a) a Linear-Zero-format sheet under a non-standard name is detected as
 *       Linear Zero and its rows are parsed (asset "Structured FI - *",
 *       sourceLayout "linear_zero_existing")
 *   (b) a Structured-FI-current-format sheet under a non-standard name is
 *       detected + parsed (sourceLayout "structured_fi_current")
 *   (c) Collar / TRS / Illiquid / Structured Credit sheets under non-standard
 *       names each auto-detect to the right parser
 *   (d) a sheet named "Structured Rate + Credit" arriving in a BLOTTER format
 *       (per-trade columns) is auto-detected and PARSED -- the mapper handles
 *       both the separate-sheet and combined Rate+Credit blotter scenarios
 *   (d2) a genuine SUMMARY control sheet (aggregated columns, no per-trade
 *       signature) stays a skipped control sheet
 *   (e) a garbage sheet (random unrelated columns) does not crash the parse
 *       and is marked "unrecognized"
 *   (f) the pre-existing standard-named fixture (ocr_work/test_non_linear_taxonomy.xlsx,
 *       the same one run_tests.js uses) still parses to the same 7 rows via
 *       ordinary name-based routing, and each of its sheets now carries a
 *       sensible detected `template` in Diagnostics (Linear Zero shows as its
 *       own template, distinct from Structured FI (current))
 *
 * Usage: cd tests && node run_template_detection.js
 *   (or) cd tests && npm run test:detect
 *
 * Exit code is non-zero if any assertion fails.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const XLSX = require("xlsx");

const REPO_ROOT = path.resolve(__dirname, "..");
const APP_FILE = "centralised_blotter_mapping_studio.html";
const EXISTING_FIXTURE = path.join(REPO_ROOT, "ocr_work", "test_non_linear_taxonomy.xlsx");

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, "127.0.0.1", () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on("error", reject);
  });
}
function startHttpServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(port)], { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let resolved = false;
    const onData = (d) => { if (!resolved && /Serving HTTP/.test(d.toString())) { resolved = true; resolve(proc); } };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", reject);
    setTimeout(() => { if (!resolved) { resolved = true; resolve(proc); } }, 800);
  });
}

// ---- Build the detection fixture workbook ----
// Column layouts below are lifted directly from the real headers/rows found in
// ocr_work/test_non_linear_taxonomy.xlsx (the fixture run_tests.js already uses),
// just placed under deliberately non-standard sheet names so name-based routing
// in findSheetName() can NOT match them and only header-signature detection can.
function aoaSheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildDetectionWorkbook() {
  const wb = XLSX.utils.book_new();

  // (a) Linear Zero under a non-standard name.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["ISIN", "Date", "Client", "Book", "Primary CCY", "Security", "Product", "Notional USD Mio", "NNBV", "Maturity Date", "Reoffer", "Issuer", "Trader", "Ticker", "Comment"],
    ["XS0000000099", "18/07/2026", "Detect Client LZ", "HK", "USD", "Linear Zero Structured Rate", "Linear Zero Rate Note", 2, 2500, "18/07/2028", 99.1, "HSBC", "Detect Trader", "SOFR", "auto-detect linear zero smoke"]
  ]), "LZ Book");

  // (b) Structured FI current-format under a non-standard name.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["ISIN Front", "SALETEAM", "First Trade Date", "FINAL CUSTOMER", "Book", "Currency", "Structure", "Underlying", "Product", "Maturity", "Total NNBV", "First Reoffer", "Size (Org Curr)", "FX rate", "Volume ('MM) USD", "Trader", "Issuer", "Product Type"],
    ["XS3307267399", "HK", "23-Feb-26", "Detect Customer SFI", "HK", "USD", "CLN Range Accrual", "XAUUSD", "CLN Credit Linked Note", "3/9/2028", 10742, "98.50%", 1, 1, 1, "HCIB", "HSBC", "Credit"]
  ]), "SFI Non Standard");

  // (c) Collar under a non-standard name.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Status", "OTC ISIN", "SALETEAM", "First Trade Date", "FINAL CUSTOMER", "Book", "Currency", "Structure", "Underlying", "Product", "Maturity", "Total GNBV (USD)", "Client Price", "Notional Amount (USD)", "PIMS Code", "PB Fee (USD)", "New/Unwind"],
    ["Traded", "EZB8MXN99CX9", "HK", "31-Oct-23", "Detect Customer Collar", "HK", "USD", "IQ UQ 12M USD Call Option", "IQ UQ", "Call Option", "31-Oct-2024", 23493, "6.97%", 4613500, "PIMSDETECT0001", 46135, "New"]
  ]), "Random Collar Sheet");

  // (c) Equity TRS under a non-standard name.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Reference number", "Product", "Trade Date", "FINAL CUSTOMER", "SALETEAM", "Book", "Currency", "Underlying", "Structure", "Maturity", "Settlement Date", "Notional in USD", "MSS Revenue in USD", "Total Bank Revenue in USD", "Commission to PB (HKD)", "FX rate", "New/Unwind"],
    [700099, "Equity TRS", "18/07/2026", "Detect Customer TRS", "HK", "HK", "USD", "0700 HK", "Equity TRS", "18/07/2027", "20/07/2026", 7000000, 200000, 260000, 78000, 0.128, "New"]
  ]), "TRS Extract");

  // (c) Illiquid Credit / Repack under a non-standard name.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Product Type", "Deal Name", "Trade Date", "FINAL CUSTOMER", "Booking", "Ccy", "Size (Org Curr)", "FX Rate", "Volume ('MM) USD", "GNBV (USD)", "NNBV", "ISIN", "SVCS No.", "Maturity", "Reoffer", "Status"],
    ["Illiquid Credit", "Repackaged Illiquid Credit Note", "18/07/2026", "Detect Customer Illiquid", "HK", "USD", 3, 1, 3, 45000, 40000, "XS1111199999", "SVCSDETECT99", "18/07/2029", 97.5, "New"]
  ]), "Illiquid Extract");

  // (c) Structured Credit 2025 under a non-standard name.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Product", "Category", "Region", "Notional (USD)", "GNBV (USD)"],
    ["CLN Basket Credit Linked Note", "CLN", "APAC", 5000000, 100000]
  ]), "SC Extract");

  // (d) "Structured Rate + Credit" arriving in a BLOTTER format (Structured-FI-current
  // columns) -- must now be auto-detected and PARSED (the mapper handles both the
  // separate-sheet and the combined Rate+Credit blotter scenarios).
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["ISIN Front", "SALETEAM", "First Trade Date", "FINAL CUSTOMER", "Total NNBV", "First Reoffer", "Volume ('MM) USD", "Product Type"],
    ["XS9999999999", "HK", "01-Jan-26", "RateCredit Blotter Client", 1000, "99.00%", 1, "Rate"]
  ]), "Structured Rate + Credit");

  // (d2) A genuine SUMMARY control sheet (aggregated, no per-trade blotter columns) --
  // must stay a skipped control sheet.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Asset Class", "Total Notional USD", "Total NNBV", "Row Count"],
    ["Structured Rate + Credit", 123000000, 456000, 42]
  ]), "Consolidate Sheet");

  // (e) Garbage sheet with random, unrelated columns -- must not crash and
  // must be marked unrecognized.
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Foo", "Bar", "Baz Column", "Random Field 1", "Random Field 2"],
    ["alpha", "bravo", "charlie", 1, 2]
  ]), "Garbage Sheet");

  return wb;
}

async function setSettingsAndParse(page, fixturePath) {
  await page.waitForFunction(() => window.__BOARD_READY === true, null, { timeout: 15000 });
  await page.evaluate(() => {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("runMode", "working");
    set("collarRowGrain", "strategy");
    set("trsVaPolicy", "mss");
    set("trsFxConvention", "multiply");
    set("illiquidStatusToBuySell", "new_fee_to_sell");
  });
  await page.setInputFiles("#workbookInput", fixturePath);
  await page.click("#btnParseWorkbook");
  await page.waitForFunction(() => window.__BOARD_READY === true && Array.isArray(window.__BOARD_SHEET_STATUS()) && window.__BOARD_SHEET_STATUS().length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(150);
}

const results = [];
function check(scenario, id, pass, detail) {
  results.push({ scenario, id, pass, detail });
}

function findStatus(statuses, actualName) {
  return statuses.find(s => (s.actual || s.sheet) === actualName);
}
function rowsForSheet(snapshot, actualName) {
  return snapshot.filter(r => r.sourceSheet === actualName);
}

async function main() {
  const port = await findFreePort();
  console.log(`[detect] starting http server on 127.0.0.1:${port} (cwd=${REPO_ROOT})`);
  const server = await startHttpServer(port);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbms-detect-"));
  const detectFixturePath = path.join(tmpDir, "template_detection_fixture.xlsx");
  XLSX.writeFile(buildDetectionWorkbook(), detectFixturePath);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const appUrl = `http://127.0.0.1:${port}/${APP_FILE}`;

    // ---- Scenario 1: the synthetic detection fixture (a, b, c, d, e) ----
    {
      const context = await browser.newContext();
      await context.addInitScript(() => { window.__SNAPSHOT_MODE = true; });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(String(e)));
      await page.goto(appUrl, { waitUntil: "load" });
      await setSettingsAndParse(page, detectFixturePath);
      const snapshot = await page.evaluate(() => window.__BOARD_SNAPSHOT());
      const statuses = await page.evaluate(() => window.__BOARD_SHEET_STATUS());
      const pills = await page.evaluate(() => window.__BOARD_PILLS());
      console.log(`[detect] DETECT_FIXTURE snapshot rows=${snapshot.length} statuses=${statuses.length} pills=${JSON.stringify(pills)}`);

      check("DETECT_FIXTURE", "no-page-errors", pageErrors.length === 0, pageErrors.length ? pageErrors.join(" | ") : "no page errors (parse did not crash on garbage sheet)");

      // (a) Linear Zero under non-standard name.
      {
        const st = findStatus(statuses, "LZ Book");
        const rows = rowsForSheet(snapshot, "LZ Book");
        check("DETECT_FIXTURE", "a-status-auto_detected", !!st && st.status === "auto_detected", `status=${st && st.status}`);
        check("DETECT_FIXTURE", "a-template-linear-zero", !!st && st.template === "Linear Zero", `template=${st && st.template}`);
        check("DETECT_FIXTURE", "a-row-parsed", rows.length === 1, `rows=${rows.length}`);
        check("DETECT_FIXTURE", "a-asset-structured-fi", rows.length === 1 && /^Structured FI - /.test(rows[0].assetClass), `assetClass=${rows[0] && rows[0].assetClass}`);
        check("DETECT_FIXTURE", "a-layout-linear-zero", rows.length === 1 && rows[0].sourceLayout === "linear_zero_existing", `sourceLayout=${rows[0] && rows[0].sourceLayout}`);
      }

      // (b) Structured FI current-format under non-standard name.
      {
        const st = findStatus(statuses, "SFI Non Standard");
        const rows = rowsForSheet(snapshot, "SFI Non Standard");
        check("DETECT_FIXTURE", "b-status-auto_detected", !!st && st.status === "auto_detected", `status=${st && st.status}`);
        check("DETECT_FIXTURE", "b-template-sfi-current", !!st && st.template === "Structured FI (current)", `template=${st && st.template}`);
        check("DETECT_FIXTURE", "b-row-parsed", rows.length === 1, `rows=${rows.length}`);
        check("DETECT_FIXTURE", "b-asset-structured-fi", rows.length === 1 && /^Structured FI - /.test(rows[0].assetClass), `assetClass=${rows[0] && rows[0].assetClass}`);
        check("DETECT_FIXTURE", "b-layout-current", rows.length === 1 && rows[0].sourceLayout === "structured_fi_current", `sourceLayout=${rows[0] && rows[0].sourceLayout}`);
      }

      // (c) Collar, TRS, Illiquid, Structured Credit under non-standard names.
      {
        const st = findStatus(statuses, "Random Collar Sheet");
        const rows = rowsForSheet(snapshot, "Collar Blotter"); // parseCollar hardcodes sourceSheet
        check("DETECT_FIXTURE", "c-collar-status", !!st && st.status === "auto_detected" && st.template === "Collar", `status=${st && st.status} template=${st && st.template}`);
        check("DETECT_FIXTURE", "c-collar-asset", rows.some(r => r.assetClass === "Collar"), `rows=${JSON.stringify(rows.map(r => r.assetClass))}`);
      }
      {
        const st = findStatus(statuses, "TRS Extract");
        const rows = rowsForSheet(snapshot, "Equity TRS"); // parseTrs hardcodes sourceSheet
        check("DETECT_FIXTURE", "c-trs-status", !!st && st.status === "auto_detected" && st.template === "Equity TRS", `status=${st && st.status} template=${st && st.template}`);
        check("DETECT_FIXTURE", "c-trs-asset", rows.some(r => r.assetClass === "Equity TRS"), `rows=${JSON.stringify(rows.map(r => r.assetClass))}`);
      }
      {
        const st = findStatus(statuses, "Illiquid Extract");
        const rows = rowsForSheet(snapshot, "Illiquid Credit+Repack"); // parseIlliquid hardcodes sourceSheet
        check("DETECT_FIXTURE", "c-illiquid-status", !!st && st.status === "auto_detected" && st.template === "Illiquid / Repack", `status=${st && st.status} template=${st && st.template}`);
        check("DETECT_FIXTURE", "c-illiquid-asset", rows.some(r => r.assetClass === "Illiquid Credit"), `rows=${JSON.stringify(rows.map(r => r.assetClass))}`);
      }
      {
        const st = findStatus(statuses, "SC Extract");
        const rows = rowsForSheet(snapshot, "Structured Credit 2025"); // parseStructuredCredit2025 hardcodes sourceSheet
        check("DETECT_FIXTURE", "c-sc-status", !!st && st.status === "auto_detected" && st.template === "Structured Credit 2025", `status=${st && st.status} template=${st && st.template}`);
        check("DETECT_FIXTURE", "c-sc-asset", rows.some(r => r.assetClass === "Structured Credit" || r.assetClass === "Private Credit"), `rows=${JSON.stringify(rows.map(r => r.assetClass))}`);
      }

      // (d) "Structured Rate + Credit" in blotter format is now auto-detected and parsed.
      {
        const st = findStatus(statuses, "Structured Rate + Credit");
        const parsedRows = snapshot.filter(r => /RateCredit Blotter Client/i.test(JSON.stringify(r)));
        check("DETECT_FIXTURE", "d-blotter-status", !!st && st.status === "auto_detected", `status=${st && st.status}`);
        check("DETECT_FIXTURE", "d-blotter-template", !!st && /Structured FI/i.test(st.template || ""), `template=${st && st.template}`);
        check("DETECT_FIXTURE", "d-blotter-parsed", parsedRows.length >= 1, `expected >=1 parsed row, got ${parsedRows.length}`);
      }

      // (d2) A genuine summary control sheet stays skipped.
      {
        const st = findStatus(statuses, "Consolidate Sheet");
        check("DETECT_FIXTURE", "d2-summary-control", !!st && st.status === "control_present", `status=${st && st.status}`);
      }

      // (e) Garbage sheet does not crash and is marked unrecognized.
      {
        const st = findStatus(statuses, "Garbage Sheet");
        check("DETECT_FIXTURE", "e-unrecognized", !!st && st.status === "unrecognized", `status=${st && st.status}`);
      }

      // (g) Overview control board surfaces a top-level warning naming the
      // unrecognized sheet, and a subordinate notice naming an auto-detected sheet.
      {
        const overviewHtml = await page.evaluate(() => document.getElementById("overview").innerHTML);
        const unparsedNotice = await page.evaluate(() => {
          const el = document.getElementById("unparsedSheetsNotice");
          return el ? { visible: !!(el.offsetParent || el.getClientRects().length), text: el.textContent } : null;
        });
        const autoDetectedNotice = await page.evaluate(() => {
          const el = document.getElementById("autoDetectedSheetsNotice");
          return el ? { visible: !!(el.offsetParent || el.getClientRects().length), text: el.textContent } : null;
        });
        check("DETECT_FIXTURE", "g-unparsed-notice-present", !!unparsedNotice, `unparsedNotice=${JSON.stringify(unparsedNotice)}`);
        check("DETECT_FIXTURE", "g-unparsed-notice-visible", !!unparsedNotice && unparsedNotice.visible, `visible=${unparsedNotice && unparsedNotice.visible}`);
        check("DETECT_FIXTURE", "g-unparsed-notice-names-sheet", !!unparsedNotice && unparsedNotice.text.includes("Garbage Sheet"), `text=${unparsedNotice && unparsedNotice.text}`);
        check("DETECT_FIXTURE", "g-unparsed-notice-in-overview", overviewHtml.includes("was not recognized") || overviewHtml.includes("were not recognized"), "overview markup contains not-recognized wording");
        check("DETECT_FIXTURE", "g-autodetected-notice-present", !!autoDetectedNotice, `autoDetectedNotice=${JSON.stringify(autoDetectedNotice)}`);
        check("DETECT_FIXTURE", "g-autodetected-notice-visible", !!autoDetectedNotice && autoDetectedNotice.visible, `visible=${autoDetectedNotice && autoDetectedNotice.visible}`);
        check("DETECT_FIXTURE", "g-autodetected-notice-names-sheet", !!autoDetectedNotice && /LZ Book|SFI Non Standard|Random Collar Sheet|TRS Extract|Illiquid Extract|SC Extract|Structured Rate \+ Credit/.test(autoDetectedNotice.text), `text=${autoDetectedNotice && autoDetectedNotice.text}`);
      }

      await context.close();
    }

    // ---- Scenario 2: existing standard-named fixture (f) ----
    {
      const context = await browser.newContext();
      await context.addInitScript(() => { window.__SNAPSHOT_MODE = true; });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(String(e)));
      await page.goto(appUrl, { waitUntil: "load" });
      await setSettingsAndParse(page, EXISTING_FIXTURE);
      const snapshot = await page.evaluate(() => window.__BOARD_SNAPSHOT());
      const statuses = await page.evaluate(() => window.__BOARD_SHEET_STATUS());
      console.log(`[detect] STANDARD_FIXTURE snapshot rows=${snapshot.length} statuses=${statuses.length}`);
      if (pageErrors.length) console.log(`[detect] STANDARD_FIXTURE page errors: ${pageErrors.join(" | ")}`);

      check("STANDARD_FIXTURE", "f-row-count-unchanged", snapshot.length === 7, `rows=${snapshot.length} (expected 7, same as run_tests.js baseline)`);

      const sfiStatus = findStatus(statuses, "Structured FI 2026");
      check("STANDARD_FIXTURE", "f-sfi-template", !!sfiStatus && sfiStatus.template === "Structured FI (current)", `template=${sfiStatus && sfiStatus.template}`);

      const lzStatus = findStatus(statuses, "Linear Zero");
      check("STANDARD_FIXTURE", "f-lz-template", !!lzStatus && lzStatus.template === "Linear Zero", `template=${lzStatus && lzStatus.template}`);
      check("STANDARD_FIXTURE", "f-lz-distinct-from-sfi", !!lzStatus && !!sfiStatus && lzStatus.template !== sfiStatus.template, `lz=${lzStatus && lzStatus.template} sfi=${sfiStatus && sfiStatus.template}`);

      const collarStatus = findStatus(statuses, "Collar Blotter");
      check("STANDARD_FIXTURE", "f-collar-template", !!collarStatus && collarStatus.template === "Collar", `template=${collarStatus && collarStatus.template}`);

      const illiquidStatus = findStatus(statuses, "Illiquid Credit+Repack");
      check("STANDARD_FIXTURE", "f-illiquid-template", !!illiquidStatus && illiquidStatus.template === "Illiquid / Repack", `template=${illiquidStatus && illiquidStatus.template}`);

      const scStatus = findStatus(statuses, "Structured Credit 2025");
      check("STANDARD_FIXTURE", "f-sc-template", !!scStatus && scStatus.template === "Structured Credit 2025", `template=${scStatus && scStatus.template}`);

      const trsStatus = findStatus(statuses, "Equity TRS");
      check("STANDARD_FIXTURE", "f-trs-template", !!trsStatus && trsStatus.template === "Equity TRS", `template=${trsStatus && trsStatus.template}`);

      check("STANDARD_FIXTURE", "f-no-page-errors", pageErrors.length === 0, pageErrors.length ? pageErrors.join(" | ") : "no page errors");

      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("\n==================== TEST REPORT ====================");
  let passCount = 0;
  let failCount = 0;
  results.forEach((r) => {
    const status = r.pass ? "PASS" : "FAIL";
    if (r.pass) passCount += 1; else failCount += 1;
    console.log(`[${status}] ${r.scenario} / ${r.id} -- ${r.detail}`);
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
  console.error("[detect] fatal error:", e);
  process.exit(1);
});
