#!/usr/bin/env node
/*
 * Selected-sheet regression harness for the OCR-restored workflow.
 *
 * The app now loads a workbook first, then maps exactly one chosen worksheet
 * after the user selects Asset + Worksheet and clicks "Process selected sheet".
 * This harness drives that flow directly and verifies the multi-asset mappings
 * without relying on the obsolete workbook-wide parse behavior.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const XLSX = require("xlsx");

const REPO_ROOT = path.resolve(__dirname, "..");
const APP_FILE = process.env.APP_FILE || "centralised_blotter_mapping_studio.html";
const STANDARD_FIXTURE = path.join(REPO_ROOT, "ocr_work", "test_non_linear_taxonomy.xlsx");

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
      if (!resolved && /Serving HTTP/.test(d.toString())) {
        resolved = true;
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", reject);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(proc);
      }
    }, 800);
  });
}

function aoaSheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildReofferRegressionFixture(filePath) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["ISIN", "Date", "Client", "Book", "Primary CCY", "Security", "Product", "Notional USD Mio", "NNBV", "Maturity Date", "Reoffer", "Issuer", "Trader", "Ticker", "Comment"],
    ["XSLEGACYCLN01", "18/07/2026", "Legacy Zero Client", "HK", "USD", "Legacy Zero Note", "CLN Credit Linked Note", 2, 2500, "18/07/2028", 0.991, "HSBC", "Legacy Trader", "SOFR", "legacy linear zero traded should ignore CLN taxonomy and normalize decimal reoffer"]
  ]), "Linear Zero Traded");
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["Product Type", "Deal Name", "Trade Date", "FINAL CUSTOMER", "Booking", "Ccy", "Volume ('MM) USD", "GNBV (USD)", "NNBV", "ISIN", "SVCS No.", "Maturity", "Reoffer", "Status", "Remarks"],
    ["Illiquid Credit", "Repackaged Decimal Reoffer Note", "18/07/2026", "HASE", "HK", "USD", 3, 45000, 40000, "XSDECIMALREO1", "SVCSDECIMAL1", "18/07/2029", 0.975, "New", "decimal reoffer smoke"]
  ]), "Illiquid Credit+Repack");
  XLSX.writeFile(wb, filePath);
}

function buildStructuredFiProductFixture(filePath) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, aoaSheet([
    ["ISIN Front", "SALETEAM", "First Trade Date", "FINAL CUSTOMER", "Book", "Currency", "Structure", "Underlying", "Product", "Maturity", "Total NNBV", "First Reoffer", "Volume ('MM) USD", "Trader", "Issuer", "Product Type"],
    ["XSLCALLABLE01", "HK", "23-Feb-26", "HASE", "HK", "USD", "Linear Zero Callable Notes", "SOFR", "Linear Zero Callable Notes", "3/9/2028", 1000, "99.00%", 1, "HCIB", "HSBC", "Rate"],
    ["XSRANGEACCR01", "HK", "23-Feb-26", "HASE", "HK", "USD", "Range Accrual with Conversion", "XAUUSD", "Range Accrual with Conversion", "3/9/2028", 10742, "98.50%", 1, "HCIB", "HSBC", "Rate"],
    ["XSCLNRANGE01", "HK", "23-Feb-26", "Nomura Private Bank", "HK", "USD", "CLN Range Accrual with Conversion", "XAUUSD", "CLN Credit Linked Note", "3/9/2028", 10742, "98.50%", 1, "HCIB", "HSBC", "Credit"]
  ]), "Structured FI Product Taxonomy");
  XLSX.writeFile(wb, filePath);
}

async function newPage(browser, appUrl) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__SNAPSHOT_MODE = true;
    try { localStorage.clear(); } catch (e) {}
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(appUrl, { waitUntil: "load" });
  await page.waitForFunction(() => window.__BOARD_READY === true, null, { timeout: 15000 });
  return { context, page, errors };
}

async function processSelectedSheet(page, fixturePath, asset, sheet) {
  await page.evaluate(() => {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("runModeSelect", "trade_by_trade");
    set("tradeIdModeSelect", "business_key");
    set("collarRowGrain", "strategy");
    set("trsVaPolicy", "mss");
    set("trsFxConvention", "multiply");
    set("illiquidStatusToBuySell", "new_fee_to_sell");
    set("copyVolumeToTV", "true");
    set("defaultSalesperson", "mark lok leung");
    set("defaultLegalEntity", "HBAP");
    set("allowTreatsPlaceholder", "true");
    set("allowTier3Placeholder", "true");
    set("pcPolicyStructuredFi", "lookup_then_va");
    set("pcPolicyIlliquid", "lookup_then_va");
    set("pcPolicyCollar", "pbfee_then_lookup");
    set("pcPolicyTrs", "commission_then_bankminusmss_then_lookup");
  });

  await page.setInputFiles("#workbookInput", fixturePath);
  await page.click("#btnParseWorkbook");
  await page.waitForFunction((sheetName) => {
    const select = document.getElementById("sheetSelect");
    return window.__BOARD_READY === true &&
      select &&
      !select.disabled &&
      Array.from(select.options).some(o => o.value === sheetName);
  }, sheet, { timeout: 20000 });

  await page.evaluate(({ asset, sheet }) => {
    const fire = (id, val) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing control ${id}`);
      el.value = val;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    fire("assetSelect", asset);
    fire("sheetSelect", sheet);
  }, { asset, sheet });

  await page.click("#btnProcess");
  await page.waitForFunction(() => {
    return window.__BOARD_READY === true &&
      Array.isArray(window.__BOARD_SNAPSHOT()) &&
      window.__BOARD_SNAPSHOT().length > 0;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(100);
  return page.evaluate(() => window.__BOARD_SNAPSHOT());
}

function assertValue(results, id, row, field, expected) {
  const actual = row ? row[field] : undefined;
  const pass = String(actual == null ? "" : actual) === String(expected);
  results.push({
    id,
    pass,
    detail: pass ? `${field}=${JSON.stringify(actual)}` : `${field} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  });
}

function assertNumericTradeId(results, id, row) {
  const tradeId = row && row.tradeId;
  const pass = /^\d+$/.test(String(tradeId || ""));
  results.push({
    id,
    pass,
    detail: pass ? `tradeId=${tradeId}` : `tradeId not numeric: ${JSON.stringify(tradeId)}`
  });
}

function assertNoMarkets(results, id, snapshot) {
  const offenders = snapshot.filter(row => [row.tier1, row.tier2, row.tier3].some(v => String(v || "").trim() === "Markets"));
  results.push({
    id,
    pass: offenders.length === 0,
    detail: offenders.length ? `Markets tier found in ${JSON.stringify(offenders)}` : "no Markets tier values"
  });
}

async function runCase(browser, appUrl, cfg, results) {
  const { context, page, errors } = await newPage(browser, appUrl);
  try {
    const snapshot = await processSelectedSheet(page, cfg.fixture, cfg.asset, cfg.sheet);
    console.log(`[selected] ${cfg.id} rows=${snapshot.length}`);
    results.push({
      id: `${cfg.id}:page-errors`,
      pass: errors.length === 0,
      detail: errors.length ? errors.join(" | ") : "no page errors"
    });
    results.push({
      id: `${cfg.id}:row-count`,
      pass: snapshot.length === cfg.rows,
      detail: `rows=${snapshot.length}, expected=${cfg.rows}`
    });
    assertNoMarkets(results, `${cfg.id}:no-markets`, snapshot);
    cfg.checks(snapshot, results);
    if (cfg.postCheck) await cfg.postCheck(page, results);
  } finally {
    await context.close();
  }
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cbms-selected-"));
  const reofferRegressionFixture = path.join(tmpDir, "reoffer_regression.xlsx");
  buildReofferRegressionFixture(reofferRegressionFixture);
  const structuredFiProductFixture = path.join(tmpDir, "structured_fi_product_taxonomy.xlsx");
  buildStructuredFiProductFixture(structuredFiProductFixture);

  const port = await findFreePort();
  const server = await startHttpServer(port);
  const appUrl = `http://127.0.0.1:${port}/${APP_FILE}`;
  console.log(`[selected] testing ${appUrl}`);

  const results = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const cases = [
      {
        id: "TC01 Structured FI CLN",
        fixture: STANDARD_FIXTURE,
        asset: "structured_fi",
        sheet: "Structured FI 2026",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC01:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC01:asset", row, "assetClass", "Structured FI - Credit");
          assertValue(r, "TC01:layout", row, "sourceLayout", "structured_fi_current");
          assertValue(r, "TC01:tier1", row, "tier1", "Structured Credit");
          assertValue(r, "TC01:tier2", row, "tier2", "Structured Credit");
          assertValue(r, "TC01:tier3", row, "tier3", "Credit Linked Note");
          assertValue(r, "TC01:treats", row, "treats", "NOSGSGH");
          assertNumericTradeId(r, "TC01:trade-id", row);
        }
      },
      {
        id: "TC01B Structured FI product taxonomy",
        fixture: structuredFiProductFixture,
        asset: "structured_fi",
        sheet: "Structured FI Product Taxonomy",
        rows: 3,
        checks(snapshot, r) {
          const linearZero = snapshot.find(row => String(row.comment || "").includes("XSLCALLABLE01"));
          const rangeAccrual = snapshot.find(row => String(row.comment || "").includes("XSRANGEACCR01"));
          const clnRange = snapshot.find(row => String(row.comment || "").includes("XSCLNRANGE01"));
          assertValue(r, "TC01B:linear-layout", linearZero, "sourceLayout", "structured_fi_current");
          assertValue(r, "TC01B:linear-tier1", linearZero, "tier1", "Structured Rates");
          assertValue(r, "TC01B:linear-tier2", linearZero, "tier2", "Interest Rate Linked Note -PPN");
          assertValue(r, "TC01B:linear-tier3", linearZero, "tier3", "Interest Rate Linked Note -PPN");
          assertNumericTradeId(r, "TC01B:linear-trade-id", linearZero);
          assertValue(r, "TC01B:range-tier1", rangeAccrual, "tier1", "Structured Rates");
          assertValue(r, "TC01B:range-tier2", rangeAccrual, "tier2", "Interest Rate Linked Note -PPN");
          assertValue(r, "TC01B:range-tier3", rangeAccrual, "tier3", "Range Accrual with Conversion");
          assertNumericTradeId(r, "TC01B:range-trade-id", rangeAccrual);
          assertValue(r, "TC01B:cln-wins-tier1", clnRange, "tier1", "Structured Credit");
          assertValue(r, "TC01B:cln-wins-tier2", clnRange, "tier2", "Structured Credit");
          assertValue(r, "TC01B:cln-wins-tier3", clnRange, "tier3", "Credit Linked Note");
          assertNumericTradeId(r, "TC01B:cln-trade-id", clnRange);
        }
      },
      {
        id: "TC02 Linear Zero",
        fixture: STANDARD_FIXTURE,
        asset: "structured_fi",
        sheet: "Linear Zero",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC02:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC02:asset", row, "assetClass", "Structured FI - Rate");
          assertValue(r, "TC02:layout", row, "sourceLayout", "linear_zero_existing");
          assertValue(r, "TC02:tier1", row, "tier1", "Structured Rates");
          assertValue(r, "TC02:tier2", row, "tier2", "Interest Rate Linked Note -PPN");
          assertValue(r, "TC02:tier3", row, "tier3", "Interest Rate Linked Note -PPN");
          assertNumericTradeId(r, "TC02:trade-id", row);
        }
      },
      {
        id: "TC02B Linear Zero Traded",
        fixture: reofferRegressionFixture,
        asset: "structured_fi",
        sheet: "Linear Zero Traded",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC02B:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC02B:asset", row, "assetClass", "Structured FI - Rate");
          assertValue(r, "TC02B:layout", row, "sourceLayout", "linear_zero_existing");
          assertValue(r, "TC02B:tier1", row, "tier1", "Structured Rates");
          assertValue(r, "TC02B:tier2", row, "tier2", "Interest Rate Linked Note -PPN");
          assertValue(r, "TC02B:tier3", row, "tier3", "Interest Rate Linked Note -PPN");
          assertValue(r, "TC02B:price", row, "price", "99.1");
          assertNumericTradeId(r, "TC02B:trade-id", row);
        }
      },
      {
        id: "TC03 Collar",
        fixture: STANDARD_FIXTURE,
        asset: "collar",
        sheet: "Collar Blotter",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC03:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC03:asset", row, "assetClass", "Collar");
          assertValue(r, "TC03:tier1", row, "tier1", "Equity Derivatives");
          assertValue(r, "TC03:tier3", row, "tier3", "Collar / Options");
          assertValue(r, "TC03:treats", row, "treats", "HASEHKP");
          assertNumericTradeId(r, "TC03:trade-id", row);
        }
      },
      {
        id: "TC04 Illiquid Repack",
        fixture: STANDARD_FIXTURE,
        asset: "illiquid_repack",
        sheet: "Illiquid Credit+Repack",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC04:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC04:asset", row, "assetClass", "Illiquid Credit");
          assertValue(r, "TC04:tier1", row, "tier1", "Structured Credit");
          assertValue(r, "TC04:tier3", row, "tier3", "Structured Credit Notes");
          assertValue(r, "TC04:treats", row, "treats", "HASEHKP");
          assertValue(r, "TC04:price", row, "price", "97.5");
          assertNumericTradeId(r, "TC04:trade-id", row);
        }
      },
      {
        id: "TC04B Illiquid Decimal Reoffer",
        fixture: reofferRegressionFixture,
        asset: "illiquid_repack",
        sheet: "Illiquid Credit+Repack",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC04B:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC04B:asset", row, "assetClass", "Illiquid Credit");
          assertValue(r, "TC04B:tier1", row, "tier1", "Structured Credit");
          assertValue(r, "TC04B:price", row, "price", "97.5");
          assertNumericTradeId(r, "TC04B:trade-id", row);
        }
      },
      {
        id: "TC05 TC06 Structured Credit 2025",
        fixture: STANDARD_FIXTURE,
        asset: "structured_fi",
        sheet: "Structured Credit 2025",
        rows: 2,
        checks(snapshot, r) {
          const cln = snapshot.find(row => row.assetClass === "Structured Credit");
          const pc = snapshot.find(row => row.assetClass === "Private Credit");
          assertValue(r, "TC05:quality", cln, "quality", "FAIL");
          assertValue(r, "TC05:tier1", cln, "tier1", "Structured Credit");
          assertValue(r, "TC05:tier3", cln, "tier3", "Credit Linked Note");
          assertNumericTradeId(r, "TC05:trade-id", cln);
          assertValue(r, "TC06:quality", pc, "quality", "FAIL");
          assertValue(r, "TC06:tier1", pc, "tier1", "Private Credit Primary");
          assertValue(r, "TC06:tier2", pc, "tier2", "Private Placement");
          assertValue(r, "TC06:tier3", pc, "tier3", "Private Placement");
          assertNumericTradeId(r, "TC06:trade-id", pc);
        },
        async postCheck(page, r) {
          await page.click('[data-tab="processedSheet"]');
          await page.waitForFunction(() => document.getElementById("processedSheet").classList.contains("active"), null, { timeout: 5000 });
          const hasControls = await page.evaluate(() => {
            return [
              "processedSheetSearch",
              "processedQuickSelectCount",
              "btnKeepTopFiltered",
              "btnKeepBottomFiltered",
              "btnInvertFiltered",
              "btnSelectAllFiltered",
              "btnClearFiltered"
            ].every(id => !!document.getElementById(id));
          });
          r.push({ id: "TC05-06:processed-controls-present", pass: hasControls, detail: hasControls ? "controls present" : "missing processed-sheet controls" });

          await page.fill("#processedSheetSearch", "private");
          await page.waitForFunction(() => document.querySelectorAll(".processed-select-row").length === 1, null, { timeout: 5000 });
          const filteredOne = await page.evaluate(() => document.querySelectorAll(".processed-select-row").length);
          r.push({ id: "TC05-06:filter-private", pass: filteredOne === 1, detail: `visible rows=${filteredOne}` });

          await page.fill("#processedSheetSearch", "");
          await page.waitForFunction(() => document.querySelectorAll(".processed-select-row").length === 2, null, { timeout: 5000 });
          await page.fill("#processedQuickSelectCount", "1");
          await page.dispatchEvent("#processedQuickSelectCount", "change");

          await page.click("#btnKeepTopFiltered");
          await page.waitForTimeout(50);
          const topState = await page.evaluate(() => Array.from(document.querySelectorAll(".processed-select-row")).map(cb => cb.checked));
          r.push({ id: "TC05-06:keep-first-n", pass: topState.length === 2 && topState[0] === true && topState[1] === false, detail: `checked=${JSON.stringify(topState)}` });

          await page.click("#btnKeepBottomFiltered");
          await page.waitForTimeout(50);
          const bottomState = await page.evaluate(() => Array.from(document.querySelectorAll(".processed-select-row")).map(cb => cb.checked));
          r.push({ id: "TC05-06:keep-last-n", pass: bottomState.length === 2 && bottomState[0] === false && bottomState[1] === true, detail: `checked=${JSON.stringify(bottomState)}` });

          await page.click("#btnInvertFiltered");
          await page.waitForTimeout(50);
          const invertedState = await page.evaluate(() => Array.from(document.querySelectorAll(".processed-select-row")).map(cb => cb.checked));
          r.push({ id: "TC05-06:invert-filtered", pass: invertedState.length === 2 && invertedState[0] === true && invertedState[1] === false, detail: `checked=${JSON.stringify(invertedState)}` });

          await page.click(".processed-cell");
          await page.waitForSelector("#processedCellEditor", { timeout: 5000 });
          const editorOpen = await page.evaluate(() => !!document.getElementById("processedCellEditor"));
          r.push({ id: "TC05-06:click-to-edit-opens", pass: editorOpen, detail: editorOpen ? "editor opened" : "editor missing" });
          await page.keyboard.press("Escape");
        }
      },
      {
        id: "TC07 Equity TRS",
        fixture: STANDARD_FIXTURE,
        asset: "equity_trs",
        sheet: "Equity TRS",
        rows: 1,
        checks(snapshot, r) {
          const row = snapshot[0];
          assertValue(r, "TC07:quality", row, "quality", "CLEAN_PASS");
          assertValue(r, "TC07:asset", row, "assetClass", "Equity TRS");
          assertValue(r, "TC07:tier1", row, "tier1", "Equity Derivatives");
          assertValue(r, "TC07:tier3", row, "tier3", "Total Return Swap");
          assertValue(r, "TC07:treats", row, "treats", "NOSGSGH");
          assertNumericTradeId(r, "TC07:trade-id", row);
        }
      }
    ];

    for (const cfg of cases) await runCase(browser, appUrl, cfg, results);
  } finally {
    if (browser) await browser.close();
    server.kill();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("\n================ SELECTED-SHEET SMOKE ================");
  let pass = 0;
  let fail = 0;
  results.forEach(result => {
    if (result.pass) pass += 1; else fail += 1;
    console.log(`[${result.pass ? "PASS" : "FAIL"}] ${result.id} -- ${result.detail}`);
  });
  console.log("=======================================================");
  console.log(`TOTAL: ${results.length} PASS: ${pass} FAIL: ${fail}`);
  if (fail) process.exit(1);
}

main().catch(e => {
  console.error("[selected] fatal error:", e);
  process.exit(1);
});
