# Automated Test Harness

This describes the automated, repeatable regression harnesses for
`centralised_blotter_mapping_studio.html`, located in `tests/`.

## Current OCR-Restored Harness

Use the selected-sheet smoke test for the current product flow:

```bash
cd tests
npm run test:selected
```

That command runs `tests/run_selected_sheet_smoke.js`. It loads a workbook, selects Asset + Worksheet, clicks `Process selected sheet`, and asserts the snapshot for one selected sheet at a time. It also creates a temporary `Linear Zero Traded` workbook whose legacy zero-linear row contains `CLN Credit Linked Note` product text; the expected result is still the OCR-original Linear Zero mapping:

- `assetClass = Structured FI - Rate`
- `sourceLayout = linear_zero_existing`
- `*Tier 1 Product Type = Structured Rates`
- `*Tier 2 Product Type = Interest Rate Linked Note -PPN`
- `*Tier 3 Product Type = Interest Rate Linked Note -PPN`
- no `Markets` tier value

The same harness also opens the Processed Sheet tab for a two-row case and checks that OCR-restored export optionality is present: filter processed rows, keep first N filtered, keep last N filtered, invert filtered, and click-to-edit a processed cell.

It also checks OCR reoffer price-point normalization: decimal reoffer inputs such as `0.991` / `0.975` must export as `99.1` / `97.5`, matching percentage or point inputs.

To test the built single-file artifact instead of source, run:

```bash
cd tests
APP_FILE=dist/centralised_blotter_mapping_studio.html npm run test:selected
```

The older harnesses below are retained for engineering reference, but `run_tests.js`, `run_template_detection.js`, and `run_starred_field_matrix.js` were authored around the previous workbook-wide parse behavior and should not be treated as the primary gate for the OCR-restored selected-sheet workflow until rewritten.

## Legacy Workbook-Wide Harness Notes

## What it proves

1. All TC01-TC07 expectations documented in `docs/non_linear_test_cases.md`
   (tiers, treats, trade IDs, volumes, VA/GNBV, PC, Buy/Sell, Working
   Pass / Fail quality) still hold against `ocr_work/test_non_linear_taxonomy.xlsx`.
2. **Illiquid/Repack Status -> Buy/Sell** (TC04-type row): source `Status`
   of `New` (or `Fee`) maps to `Buy/Sell = Sell` under the default
   `illiquidStatusToBuySell = new_fee_to_sell` setting, and to `Buy/Sell = ""`
   (blank) when the select is switched to `off`.
3. **TRS FX convention** (TC07-type row): `*$ PC = 9984` under the default
   `trsFxConvention = multiply` (`78000 x 0.128`), and `*$ PC = 609375` under
   `trsFxConvention = divide` (`78000 / 0.128`).
4. **Economics comment tokens**: Structured FI rows (TC01-type) carry
   `coupon=`, `coupon_raw=`, `first_reoffer=` (etc.) tokens in `Comment` when
   the corresponding source columns are present; Collar rows (TC03-type)
   carry `strike_pct=`, `strike_level=`, `num_options=`, `client_price=`,
   `total_gnbv_bps=` (etc.) tokens.

All checks read directly from `window.__BOARD_SNAPSHOT()` — the same
read-only hook the app exposes for automation — so the harness is testing
exactly what a human would see rendered on the board.

## Prerequisites

- Node.js and npm (already required for this repo's tooling).
- `python3` on PATH (used only to serve the repo directory over plain HTTP
  so the CDN `<script>` tags for xlsx/highcharts/papaparse and any relative
  `fetch()` calls behave like a real deployment; `file://` breaks CDN/fetch
  loading in Chromium).
- Network access to `unpkg.com` / `cdn.jsdelivr.net` (or wherever the app's
  CDN script tags point) — the same requirement the earlier manual smoke
  tests had (see `ocr_work/chrome_smoke.log`).
- Playwright + its bundled Chromium browser, installed locally into `tests/`
  (see Setup below). If Playwright cannot be installed in your environment,
  see "Fallback" below.

## Setup (one-time)

```
cd tests
npm install
```

This installs `playwright` from `tests/package.json` and downloads its
Chromium binary into the npm/Playwright cache. No global install is
required; everything lives under `tests/node_modules`.

## Running

```
cd tests
node run_tests.js
```

Exit code is `0` when every assertion passes, non-zero otherwise. A full
per-check `[PASS]`/`[FAIL]` report prints to stdout, e.g.:

```
[PASS] BASELINE / TC01 / tradeId -- tradeId=4204720592
[PASS] BASELINE / TC04 / buySell -- buySell="Sell"
...
TOTAL: 81  PASS: 81  FAIL: 0
```

To capture a run to the standard log location used by this repo:

```
cd tests
node run_tests.js > ../ocr_work/automated_test_run.log 2>&1
```

## How it works

`tests/run_tests.js`:

1. Picks a free localhost port and starts `python3 -m http.server <port>`
   rooted at the repo directory.
2. Launches headless Chromium via Playwright.
3. For each of three scenarios (default settings; `illiquidStatusToBuySell
   = off`; `trsFxConvention = divide`):
   - Opens a fresh browser context with `addInitScript` setting
     `window.__SNAPSHOT_MODE = true` before any app script runs (this also
     matches the app's own `SNAPSHOT_MODE` detection via `navigator.webdriver`
     / `HeadlessChrome` UA, so headless Playwright is already covered, but
     the explicit flag makes intent unambiguous).
   - Navigates to the app and waits for `window.__BOARD_READY === true`.
   - Sets the `#illiquidStatusToBuySell` and `#trsFxConvention` selects via
     `page.selectOption` and dispatches a `change` event (mirroring what a
     real user interaction does), matching the app's own
     `qs(id).addEventListener("change", ...)` wiring.
   - Uploads `ocr_work/test_non_linear_taxonomy.xlsx` to `#workbookInput`
     via `page.setInputFiles`.
   - Clicks `#btnParseWorkbook` (the app only re-parses the workbook on this
     click; settings changes alone only re-run `rebuildMapping()` against
     already-parsed rows, so settings must be set *before* the parse click
     for TC04/TC07 toggle scenarios).
   - Waits for `window.__BOARD_READY === true` and a non-empty
     `window.__BOARD_SNAPSHOT()`.
   - Reads `window.__BOARD_SNAPSHOT()` and `window.__BOARD_PILLS()`.
4. Asserts every field in `tests/expected.js` against the corresponding
   snapshot row (rows are indexed 0-6 in fixed parse order: Structured FI,
   Linear Zero, Collar, Illiquid, Structured Credit CLN, Private Credit,
   Equity TRS) and checks that `Comment` contains expected substrings.
5. Prints a `[PASS]`/`[FAIL]` line per assertion and a final tally; exits
   `1` if any assertion failed.

## Assertions module

`tests/expected.js` encodes the expected matrix as four scenario objects:

- `BASELINE` — default settings; full TC01-TC07 field matrix plus economics
  comment-token checks.
- `ILLIQUID_OFF` — `illiquidStatusToBuySell = off`; asserts TC04 `Buy/Sell`
  is blank.
- `TRS_DIVIDE` — `trsFxConvention = divide`; asserts TC07 `*$ PC = 609375`.
- `ECONOMICS_TOKEN_CHECKS` — asserts Structured FI / Collar rows carry at
  least one of their expected economics tokens in `Comment` (checked against
  the `BASELINE` snapshot).

Note: `quality` in `window.__BOARD_SNAPSHOT()` is the app's internal enum
(`WORKING_PASS`, `FAIL`, `CLEAN_PASS`, `CONTROLLED_PASS`), not the rendered
badge label (`Working Pass`, `Fail`, ...) shown in the UI — `expected.js`
asserts against the enum values.

## Fixture reuse (no new fixture needed)

Proving the `off` and `divide` toggle variants only requires re-running the
existing `ocr_work/test_non_linear_taxonomy.xlsx` workbook with different
settings before each parse — the harness does exactly this across its three
scenarios. No additional fixture file was needed and the existing 7-row
workbook is untouched.

## Fallback if Playwright cannot be installed

If `npm install` cannot reach the npm registry or download the Chromium
binary in your environment, an alternative is to drive the system-installed
Chrome directly via the same `--headless=new --dump-dom` / remote-debugging
technique used for the earlier manual smoke tests recorded in
`ocr_work/chrome_smoke.log` and `ocr_work/http_server_saved_settings_playwright.log`,
scripted with a small wrapper that:

1. Starts `python3 -m http.server <port>` in the repo root (same as above).
2. Launches Chrome with `--headless=new --remote-debugging-port=<port2>
   --user-data-dir=<tmp>`.
3. Drives the page over the Chrome DevTools Protocol (e.g. via a minimal
   CDP client, or `chrome-remote-interface` if installable) to set the file
   input, click Parse, and evaluate `window.__BOARD_SNAPSHOT()`.

This repo's environment had working npm registry access and Playwright's
Chromium installed successfully, so this fallback was not needed for the
current harness — Playwright is the supported path. Document any switch to
the fallback here if a future environment requires it.
