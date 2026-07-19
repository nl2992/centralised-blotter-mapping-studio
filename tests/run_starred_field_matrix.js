#!/usr/bin/env node
/*
 * Starred-field coverage matrix harness for centralised_blotter_mapping_studio.html
 *
 * Selected-sheet companion to run_selected_sheet_smoke.js. It loads the complete
 * fixture (ocr_work/test_starred_field_matrix.xlsx), processes each target sheet
 * through the restored Asset + Worksheet + Process selected sheet flow, and uses
 * window.__BOARD_STAR_AUDIT() to check, for every (asset class x 13 starred field)
 * cell, whether the field populated AND how it was populated (className).
 *
 * Verdicts per cell:
 *   PASS  - the field populated as authored (exact value and/or acceptable className).
 *   FAIL  - a field that SHOULD populate did not, populated wrongly, or is only a
 *           PLACEHOLDER (placeholder text is NOT real coverage). Also fires if a
 *           documented gap unexpectedly started populating (docs then stale).
 *   GAP   - a field authored as a KNOWN app gap that is indeed unpopulated
 *           (UNRESOLVED/BLANK). Confirms the documented gap; not a failure, but
 *           surfaced loudly in the report and totals.
 *
 * Exit code is non-zero if any cell FAILs.
 *
 * Usage:  cd tests && node run_starred_field_matrix.js
 *   (or)  cd tests && npm run test:matrix
 *
 * className vocabulary (from the app): SOURCE_BACKED / LOOKUP_BACKED /
 * POLICY_DERIVED / PLACEHOLDER / UNRESOLVED / BLANK (+ RULE_BACKED/MANUAL_OVERRIDE).
 * "Real coverage" = anything except PLACEHOLDER / UNRESOLVED / BLANK.
 */
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const REPO_ROOT = path.resolve(__dirname, "..");
const APP_FILE = process.env.APP_FILE || "centralised_blotter_mapping_studio.html";
const FIXTURE = path.join(REPO_ROOT, "ocr_work", "test_starred_field_matrix.xlsx");

const REAL_CLASSES = ["SOURCE_BACKED", "LOOKUP_BACKED", "POLICY_DERIVED", "CONSTANT", "RULE_BACKED", "MANUAL_OVERRIDE"];
const UNPOPULATED_CLASSES = ["UNRESOLVED", "BLANK"];

// The 13 starred fields, in report-column order. *$ Volume is keyed "Primary Amount"
// in the audit output (intentional two-way alias), so we look it up under that key
// but LABEL it *$ Volume in the report.
const FIELD_COLUMNS = [
  { key: "*Trade Date", label: "*Trade Date" },
  { key: "*Primary CCY", label: "*Primary CCY" },
  { key: "Primary Amount", label: "*$ Volume" },
  { key: "*$ PC", label: "*$ PC" },
  { key: "*$ VA/GNBV", label: "*$ VA/GNBV" },
  { key: "*Trade ID", label: "*Trade ID" },
  { key: "*Revenue CCY", label: "*Revenue CCY" },
  { key: "*Tier 1 Product Type", label: "*Tier 1" },
  { key: "*Tier 2 Product Type", label: "*Tier 2" },
  { key: "*Tier 3 Product Type", label: "*Tier 3" },
  { key: "*Salesperson (Coverage)", label: "*Salesperson" },
  { key: "*Legal Entity", label: "*Legal Entity" },
  { key: "*Treats Acronym", label: "*Treats" }
];

// Expectation helpers.
// v(value, [classes])  -> exact string value; className must be in `classes`.
// pop([classes])       -> value non-empty; className in `classes` (for non-deterministic hashes).
// gap()                -> KNOWN gap: value empty AND className UNRESOLVED/BLANK.
const v = (value, classes) => ({ kind: "value", value: String(value), classes: classes || REAL_CLASSES });
const pop = (classes) => ({ kind: "populated", classes: classes || REAL_CLASSES });
const gap = () => ({ kind: "gap" });

// Constants shared across all rows.
const REV = v("USD", ["POLICY_DERIVED"]);
const SALES = v("mark lok leung", ["POLICY_DERIVED"]);
const LEGAL = v("HBAP", ["POLICY_DERIVED"]);
const CCY = v("USD", ["SOURCE_BACKED"]);
const POLICY_OR_LOOKUP = ["POLICY_DERIVED", "LOOKUP_BACKED"];

// Authored expectation matrix: assetClass -> { fieldKey -> expectation }.
// Every value below was authored against, and re-verified against, the REAL
// __BOARD_STAR_AUDIT() output for the actual ocr_work/test_starred_field_matrix.xlsx
// fixture now on disk (built with realistic 2026 trade dates and asset-class-
// specific ISIN/notional/GNBV data; see docs/starred_field_gap_report.md and
// docs/asset_class_input_spec.md). NOTE: an earlier draft of this expectation
// matrix (dates like "10/02/2025", sequential across rows, and exact
// SOURCE_BACKED Treats-Acronym values for Structured Credit/Private Credit) was
// authored against stale/placeholder fixture values that do not match this
// fixture and do not match what the parser code can produce (see the
// Structured Credit / Private Credit *Treats Acronym gap() note below) -- fixed
// here after re-running the harness against the real fixture.
const EXPECT = {
  "Structured FI - Rate": {
    "*Trade Date": v("15/01/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("1000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("15000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Structured Rates", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Interest Rate Linked Note -PPN", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Interest Rate Linked Note -PPN", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("NOSGSGH", POLICY_OR_LOOKUP)
  },
  "Structured FI - Credit": {
    "*Trade Date": v("20/02/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("2000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("20000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV,
    // Product = "CLN Credit Linked Note" matches BUILT_IN_PRODUCT_TAXONOMY's "CLN"
    // rule, which wins over TIER_DEFAULTS["Structured FI - Credit"] inside
    // classify() -- intentional, correct app behavior.
    "*Tier 1 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Credit Linked Notes", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("HASEHKP", POLICY_OR_LOOKUP)
  },
  "Structured FI - FX": {
    "*Trade Date": v("05/03/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("3000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("30000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Structured Rates", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Interest Rate Linked Note -PPN", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Interest Rate Linked Note -PPN", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("NOSGSGH", POLICY_OR_LOOKUP)
  },
  "Structured FI - Unknown": {
    "*Trade Date": v("10/03/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("1500000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("12000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Structured Rates", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Interest Rate Linked Note -PPN", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Interest Rate Linked Note -PPN", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("NOSGSGH", POLICY_OR_LOOKUP)
  },
  "Illiquid Credit": {
    "*Trade Date": v("10/04/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("4000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("40000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Structured Credit Notes", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("HASEHKP", POLICY_OR_LOOKUP)
  },
  "Repack": {
    "*Trade Date": v("12/04/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("5000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("50000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Structured Credit Notes", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("NOSGSGH", POLICY_OR_LOOKUP)
  },
  "Collar": {
    "*Trade Date": v("01/05/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("5000000", ["SOURCE_BACKED"]), // MAX across the 2 legs (5,000,000 vs 3,000,000)
    "*$ PC": v("80000", ["POLICY_DERIVED"]), // SUM PB Fee (USD) across legs: 50000 + 30000
    "*$ VA/GNBV": v("40000", ["SOURCE_BACKED"]), // SUM Total GNBV (USD): 25000 + 15000
    // PIMS Code "PIMSFULL0001" is alphanumeric (not pure digits), so *Trade ID
    // resolves via the deterministic numeric-hash fallback, not a direct native ID.
    "*Trade ID": pop(["POLICY_DERIVED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Equity Derivatives", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Equity Derivatives", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Collar / Options", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("HASEHKP", POLICY_OR_LOOKUP)
  },
  "Equity TRS": {
    "*Trade Date": v("15/06/2026", ["SOURCE_BACKED"]), "*Primary CCY": CCY,
    "Primary Amount": v("9000000", ["SOURCE_BACKED"]),
    "*$ PC": v("11520", ["POLICY_DERIVED"]), // Commission to PB (HKD) 90000 x FX 0.128, default "multiply"
    "*$ VA/GNBV": v("250000", ["SOURCE_BACKED"]), // MSS Revenue in USD (default trsVaPolicy=mss)
    "*Trade ID": pop(["SOURCE_BACKED", "POLICY_DERIVED"]), // Business-key mode returns a deterministic numeric ID; native-ref mode can pass through 700001.
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Equity Derivatives", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Equity Derivatives", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Total Return Swap", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": v("NOSGSGH", POLICY_OR_LOOKUP)
  },
  "Structured Credit": {
    // parseStructuredCredit2025() never reads a trade-date column (none exists on
    // the "Structured Credit 2025" sheet at all); row.tradeDate is hardcoded null
    // and *Trade Date has no placeholder fallback in mapOne() -- genuine,
    // input-independent gap, confirmed via gap().
    "*Trade Date": gap(),
    "*Primary CCY": CCY, // hardcoded constant "USD" in the parser itself, not a real source read (see gap report traceability note)
    "Primary Amount": v("7000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("140000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV,
    // Product = "CLN Basket Note" matches the built-in "CLN" taxonomy rule the
    // same way as Structured FI - Credit above -- Structured Credit/Structured
    // Credit/Credit Linked Notes wins over the plain TIER_DEFAULTS entry.
    "*Tier 1 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Structured Credit", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Credit Linked Notes", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    // client/book/saleTeam are all hardcoded "" by the parser (no such columns
    // exist on the sheet either) -> neither the built-in client Treats map nor PB
    // booking-site routing can ever resolve -> only the working-mode PLACEHOLDER
    // can fill this field. gap() flags PLACEHOLDER as a confirmed, non-failing GAP.
    "*Treats Acronym": gap()
  },
  "Private Credit": {
    "*Trade Date": gap(), // same root cause as Structured Credit
    "*Primary CCY": CCY,
    "Primary Amount": v("8000000", ["SOURCE_BACKED"]), "*$ PC": v("0", ["POLICY_DERIVED"]),
    "*$ VA/GNBV": v("160000", ["SOURCE_BACKED"]), "*Trade ID": pop(["POLICY_DERIVED", "SOURCE_BACKED"]),
    "*Revenue CCY": REV, "*Tier 1 Product Type": v("Private Credit Primary", POLICY_OR_LOOKUP),
    "*Tier 2 Product Type": v("Private Placement", POLICY_OR_LOOKUP),
    "*Tier 3 Product Type": v("Private Placement", POLICY_OR_LOOKUP),
    "*Salesperson (Coverage)": SALES, "*Legal Entity": LEGAL,
    "*Treats Acronym": gap() // same root cause as Structured Credit
  }
};

const ASSET_ORDER = [
  "Structured FI - Rate", "Structured FI - Credit", "Structured FI - FX", "Structured FI - Unknown",
  "Illiquid Credit", "Repack", "Collar", "Equity TRS",
  "Structured Credit", "Private Credit"
];

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

// Default-mode settings, set explicitly so the run is deterministic regardless of any
// persisted localStorage (mirrors run_tests.js's page.evaluate + change-event pattern).
async function setDefaultSettingsAndParse(page) {
  await page.waitForFunction(() => window.__BOARD_READY === true, null, { timeout: 15000 });
  await page.evaluate(() => {
    const set = (id, val, fire = true) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      if (fire) el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("runMode", "working");
    set("complianceMode", "pragmatic");
    set("collarRowGrain", "strategy");
    set("trsVaPolicy", "mss");
    set("trsFxConvention", "multiply");
    set("illiquidStatusToBuySell", "new_fee_to_sell");
    set("copyVolumeToTV", "true");
    set("defaultSalesperson", "mark lok leung");
    set("defaultLegalEntity", "HBAP");
    set("allowTreatsPlaceholder", "true");
    set("allowTier3Placeholder", "true");
    set("pcPolicyStructuredFi", "lookup_then_zero");
    set("pcPolicyIlliquid", "lookup_then_zero");
    set("pcPolicyCollar", "pbfee_then_zero");
    set("pcPolicyTrs", "commission_then_lookup_then_zero");
  });

  await page.setInputFiles("#workbookInput", FIXTURE);
  await page.click("#btnParseWorkbook");
  await page.waitForFunction(() => {
    const select = document.getElementById("sheetSelect");
    return window.__BOARD_READY === true &&
      select &&
      !select.disabled &&
      Array.from(select.options).some(o => o.value === "Structured FI 2026");
  }, null, { timeout: 20000 });

  const runs = [
    { asset: "structured_fi", sheet: "Structured FI 2026" },
    { asset: "collar", sheet: "Collar Blotter" },
    { asset: "illiquid_repack", sheet: "Illiquid Credit+Repack" },
    { asset: "structured_fi", sheet: "Structured Credit 2025" },
    { asset: "equity_trs", sheet: "Equity TRS" }
  ];
  const audit = [];
  for (const run of runs) {
    await page.evaluate(({ asset, sheet }) => {
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Missing control ${id}`);
        el.value = val;
      };
      set("assetSelect", asset);
      set("sheetSelect", sheet);
      set("runModeSelect", "trade_by_trade");
      set("tradeIdModeSelect", "business_key");
    }, run);
    await page.click("#btnProcess");
    await page.waitForFunction((sheet) => {
      const rows = window.__BOARD_STAR_AUDIT && window.__BOARD_STAR_AUDIT();
      return window.__BOARD_READY === true &&
        Array.isArray(rows) &&
        rows.length > 0 &&
        rows.every(r => r.sourceSheet === sheet);
    }, run.sheet, { timeout: 30000 });
    audit.push(...await page.evaluate(() => window.__BOARD_STAR_AUDIT()));
  }
  return audit;
}

function evalCell(expect, cell) {
  const className = (cell && cell.className) || "";
  const value = cell ? (cell.value == null ? "" : String(cell.value)) : "";
  const isPlaceholder = className === "PLACEHOLDER";
  const isUnpopulated = value === "" || UNPOPULATED_CLASSES.includes(className);

  if (!expect) return { verdict: "FAIL", note: "no expectation authored", value, className };

  if (expect.kind === "gap") {
    if (isPlaceholder) return { verdict: "GAP", note: "gap via PLACEHOLDER (not real coverage)", value, className };
    if (isUnpopulated) return { verdict: "GAP", note: "confirmed gap (unpopulated)", value, className };
    return { verdict: "FAIL", note: "authored as GAP but populated -> update docs", value, className };
  }

  if (isPlaceholder) return { verdict: "FAIL", note: "PLACEHOLDER is not real coverage", value, className };
  if (isUnpopulated) return { verdict: "FAIL", note: `expected populated, got ${className || "empty"}`, value, className };
  if (!expect.classes.includes(className)) return { verdict: "FAIL", note: `className ${className} not in [${expect.classes.join(",")}]`, value, className };
  if (expect.kind === "value" && value !== expect.value) return { verdict: "FAIL", note: `value ${JSON.stringify(value)} != expected ${JSON.stringify(expect.value)}`, value, className };
  return { verdict: "PASS", note: expect.kind === "value" ? `= ${JSON.stringify(value)}` : "populated", value, className };
}

function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length); }

async function main() {
  const port = await findFreePort();
  console.log(`[matrix] starting http server on 127.0.0.1:${port} (cwd=${REPO_ROOT})`);
  const server = await startHttpServer(port);

  let audit;
  const pageErrors = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { window.__SNAPSHOT_MODE = true; });
    const page = await ctx.newPage();
    page.on("pageerror", e => pageErrors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/${APP_FILE}`, { waitUntil: "load" });
    audit = await setDefaultSettingsAndParse(page);
    await ctx.close();
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  if (pageErrors.length) console.log(`[matrix] page errors: ${pageErrors.join(" | ")}`);
  console.log(`[matrix] star-audit rows=${audit.length}`);

  const byAsset = {};
  audit.forEach(r => { byAsset[r.assetClass] = r; });

  const cellResults = [];
  let pass = 0, fail = 0, gapCount = 0, missingRows = 0;

  ASSET_ORDER.forEach(asset => {
    const auditRow = byAsset[asset];
    const expectRow = EXPECT[asset] || {};
    if (!auditRow) {
      missingRows += 1;
      FIELD_COLUMNS.forEach(col => {
        cellResults.push({ asset, field: col.key, verdict: "FAIL", value: "", className: "", note: "asset-class row missing from audit" });
        fail += 1;
      });
      return;
    }
    FIELD_COLUMNS.forEach(col => {
      const res = evalCell(expectRow[col.key], auditRow.fields[col.key]);
      cellResults.push({ asset, field: col.key, verdict: res.verdict, value: res.value, className: res.className, note: res.note });
      if (res.verdict === "PASS") pass += 1;
      else if (res.verdict === "GAP") gapCount += 1;
      else fail += 1;
    });
  });

  // ---- Compact matrix (rows = asset class, cols = starred field) ----
  console.log("\n==================== STARRED-FIELD COVERAGE MATRIX ====================");
  const header = pad("asset class \\ field", 24) + FIELD_COLUMNS.map(c => pad(c.label, 13)).join("");
  console.log(header);
  console.log("-".repeat(header.length));
  ASSET_ORDER.forEach(asset => {
    const cells = FIELD_COLUMNS.map(col => {
      const r = cellResults.find(x => x.asset === asset && x.field === col.key);
      const mark = r.verdict === "PASS" ? "PASS" : (r.verdict === "GAP" ? "GAP " : "FAIL");
      return pad(mark, 13);
    });
    console.log(pad(asset, 24) + cells.join(""));
  });

  // ---- Detail: value + className per cell ----
  console.log("\n==================== CELL DETAIL (verdict | field | value | className | note) ====================");
  ASSET_ORDER.forEach(asset => {
    console.log(`\n# ${asset}`);
    FIELD_COLUMNS.forEach(col => {
      const r = cellResults.find(x => x.asset === asset && x.field === col.key);
      const tag = r.verdict === "PASS" ? "[PASS]" : (r.verdict === "GAP" ? "[GAP ]" : "[FAIL]");
      console.log(`  ${tag} ${pad(col.label, 14)} ${pad(JSON.stringify(r.value), 16)} ${pad(r.className, 15)} ${r.note}`);
    });
  });

  // ---- Gap summary ----
  const gaps = cellResults.filter(r => r.verdict === "GAP");
  console.log("\n==================== GENUINE GAPS (documented, not failures) ====================");
  if (!gaps.length) console.log("  (none)");
  else gaps.forEach(g => console.log(`  GAP: ${g.field} @ ${g.asset} -> className=${g.className || "empty"} (${g.note})`));

  // ---- Totals ----
  console.log("\n==================== TOTALS ====================");
  console.log(`Asset classes: ${ASSET_ORDER.length}   Fields per class: ${FIELD_COLUMNS.length}   Cells: ${cellResults.length}`);
  console.log(`PASS (real coverage): ${pass}   GAP (documented): ${gapCount}   FAIL: ${fail}`);
  if (missingRows) console.log(`Missing asset-class rows: ${missingRows}`);
  console.log("================================================");

  if (fail > 0) {
    console.error(`\n${fail} cell(s) FAILED (a field that SHOULD populate did not, or is placeholder-only).`);
    process.exit(1);
  } else {
    console.log(`\nAll ${pass} should-populate cells passed. ${gapCount} documented gap cell(s) confirmed. No unexpected failures.`);
    process.exit(0);
  }
}

main().catch(e => { console.error("[matrix] fatal error:", e); process.exit(1); });
