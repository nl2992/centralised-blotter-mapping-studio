# Non-Linear Mapper Test Cases

Generated: 2026-07-18. Updated: 2026-07-18 to cover the automated harness and new settings-driven behavior (Illiquid Status->Buy/Sell, TRS FX convention, economics comment tokens).  
Workbook fixture: `ocr_work/test_non_linear_taxonomy.xlsx`  
Browser smoke log: `ocr_work/non_linear_taxonomy_smoke.log`  
Browser smoke screenshot: `ocr_work/non_linear_taxonomy_smoke.png`  
Automated harness run log: `ocr_work/automated_test_run.log` (see "Automated Harness" section below)

These are the minimum one-row-per-family test cases currently wired into the mapper smoke test. The rows are intentionally small and focused: each one proves a specific branch while preserving the existing zero-linear path.

PLUTO means the output template. Every output field beginning with `*` has to be populated for PLUTO readiness, including `*$ Volume`. Rows with intentionally sparse source data can still prove parser behavior, but they remain Fail until the missing starred PLUTO fields are supplied by source columns, reference data, Mapping Studio rules, or manual overrides.

## Test Case Summary

| ID | Source sheet | Scenario | Expected status |
|---|---|---|---|
| TC01 | `Structured FI 2026` | Current Structured FI layout with CLN text and Nomura Private Bank client | Working Pass |
| TC02 | `Linear Zero` | Existing zero-linear layout using accepted aliases | Working Pass |
| TC03 | `Collar Blotter` | Collar strategy row with HASE client and PB Fee PC | Working Pass |
| TC04 | `Illiquid Credit+Repack` | Illiquid/Repack row with Repackaged text and HASE client | Working Pass |
| TC05 | `Structured Credit 2025` | CLN Structured Credit row with sparse source columns | Fail until missing starred PLUTO fields are supplied |
| TC06 | `Structured Credit 2025` | Private Credit / Private Placement row with sparse source columns | Fail until missing starred PLUTO fields are supplied |
| TC07 | `Equity TRS` | TRS row with numeric native reference and Nomura PB client | Working Pass |

## Expected Output Matrix

| ID | Expected asset class | Tier 1 | Tier 2 | Tier 3 | Treats | Trade ID behavior | Key expected outputs |
|---|---|---|---|---|---|---|---|
| TC01 | Structured FI - Credit | Structured Credit | Structured Credit | Credit Linked Notes | `NOSGSGH` | Numeric derived from native `XS3307267255`; native ref in Comment and ISIN Code | Trade Date `23/02/2026`; Primary CCY `USD`; `*$ Volume` `1000000`; VA/GNBV `10742`; PC via VA proxy. |
| TC02 | Structured FI - Rate | Markets | Structured Products | Structured Rates | Placeholder unless reference supplied | Numeric derived from native `XS0000000001`; native ref in Comment and ISIN Code | Trade Date `18/07/2026`; Primary CCY `USD`; `*$ Volume` `2000000`; VA/GNBV `2500`; PC via VA proxy; `source_layout=linear_zero_existing`. |
| TC03 | Collar | Markets | Equity Derivatives | Collar / Options | `HASEHKP` | Numeric derived from native PIMS/OTC reference | Trade Date `31/10/2023`; `*$ Volume` `4613500`; VA/GNBV `23493`; PC `46135`; Buy/Sell `Buy`. |
| TC04 | Illiquid Credit | Structured Credit | Structured Credit | Structured Credit Notes | `HASEHKP` | Numeric derived from native `XS1111111111`; native ref in Comment and ISIN Code | Trade Date `18/07/2026`; `*$ Volume` `3000000`; VA/GNBV `45000`; PC via VA proxy; Status retained in Comment; Buy/Sell `Sell` under default `illiquidStatusToBuySell=new_fee_to_sell` setting (Status "New"). |
| TC05 | Structured Credit | Structured Credit | Structured Credit | Credit Linked Notes | Placeholder unless reference/rule supplied | Deterministic numeric ID from internal synthetic `SC-*` seed | Primary CCY `USD`; `*$ Volume` `5000000`; VA/GNBV `100000`; Trade Date blank by source limitation. |
| TC06 | Private Credit | Private Credit Primary | Private Placement | Private Placement | Placeholder unless reference/rule supplied | Deterministic numeric ID from internal synthetic `SC-*` seed | Primary CCY `USD`; `*$ Volume` `6000000`; VA/GNBV `120000`; Trade Date blank by source limitation. |
| TC07 | Equity TRS | Markets | Equity Derivatives | Total Return Swap | `NOSGSGH` | Native numeric `123456` remains source-backed numeric output | Trade Date `18/07/2026`; `*$ Volume` `7000000`; VA/GNBV `200000` by MSS policy; PC `9984` by HKD commission x FX; Buy/Sell `Buy`. |

## TC01 Structured FI Current Layout / CLN

Source row highlights:

| Source column | Test value |
|---|---|
| `ISIN Front` | `XS3307267255` |
| `SALETEAM` | `HK` |
| `First Trade Date` | `23-Feb-26` |
| `FINAL CUSTOMER` | `Nomura Private Bank` |
| `Book` | `HK` |
| `Currency` | `USD` |
| `Structure` | `CLN Range Accrual with Conversion` |
| `Underlying` | `XAUUSD` |
| `Product` | `CLN Credit Linked Note` |
| `Maturity` | `3/9/2028` |
| `Total NNBV` | `10742` |
| `First Reoffer` | `98.50%` |
| `Volume ('MM) USD` | `1` |
| `Trader` | `HCIB` |
| `Issuer` | `HSBC` |
| `Summit ID` | `4190` |
| `Remarks` | `New` |
| `Product Type` | `Credit` |

Expected assertions:

| Output field | Expected |
|---|---|
| `*Tier 1 Product Type` | `Structured Credit` |
| `*Tier 2 Product Type` | `Structured Credit` |
| `*Tier 3 Product Type` | `Credit Linked Notes` |
| `*Treats Acronym` | `NOSGSGH` |
| `*Trade ID` | Numeric, current smoke value `4204720592` |
| `Comment` | Contains `source_layout=structured_fi_current` and `native_trade_ref=XS3307267255`; now also contains economics key=value tokens sourced from the row's `Coupon`, `Coupon (raw)`, and `First Reoffer` columns when present (e.g. `coupon=6.00% p.a`, `first_reoffer=98.50%`) |

## TC02 Existing Linear Zero Layout

Source row highlights:

| Source column | Test value |
|---|---|
| `ISIN` | `XS0000000001` |
| `Date` | `18/07/2026` |
| `Client` | `Existing Client` |
| `Book` | `HK` |
| `Primary CCY` | `USD` |
| `Security` | `Linear Zero Structured Rate` |
| `Product` | `Linear Zero Rate Note` |
| `Notional USD Mio` | `2` |
| `NNBV` | `2500` |
| `Maturity Date` | `18/07/2028` |
| `Reoffer` | `99.1` |
| `Issuer` | `HSBC` |
| `Trader` | `Existing Trader` |
| `Ticker` | `SOFR` |
| `Comment` | `zero-linear smoke` |

Expected assertions:

| Output field | Expected |
|---|---|
| `*Tier 1 Product Type` | `Markets` |
| `*Tier 2 Product Type` | `Structured Products` |
| `*Tier 3 Product Type` | `Structured Rates` |
| `*$ Volume` | `2000000` |
| `*$ VA/GNBV` | `2500` |
| `*Trade ID` | Numeric, current smoke value `3329199354` |
| `Comment` | Contains `source_layout=linear_zero_existing` and `native_trade_ref=XS0000000001` |

## TC03 Collar Blotter

Source row highlights:

| Source column | Test value |
|---|---|
| `Status` | `Traded` |
| `OTC ISIN` | `EZB8MXN88CX1` |
| `SALETEAM` | `HK` |
| `Year` | `2023` |
| `First Trade Date` | `31-Oct-23` |
| `FINAL CUSTOMER` | `HASE` |
| `Book` | `HK` |
| `Currency` | `USD` |
| `Structure` | `IQ UQ 12M USD Call Option` |
| `Underlying` | `IQ UQ` |
| `Product` | `Call Option` |
| `Maturity` | `31-Oct-2024` |
| `Total GNBV (USD)` | `23493` |
| `Notional Amount (USD)` | `4613500` |
| `PIMS Code` | `0296641 / 0296640` |
| `PB Fee (USD)` | `46135` |
| `New/Unwind` | `New` |

Expected assertions:

| Output field | Expected |
|---|---|
| `*Treats Acronym` | `HASEHKP` |
| `*Trade ID` | Numeric, current smoke value `2381983830` |
| `*$ Volume` | `4613500` |
| `*$ VA/GNBV` | `23493` |
| `*$ PC` | `46135` |
| `Buy/Sell` | `Buy` |
| `Comment` | Now also contains economics key=value tokens sourced from `Strike (%)`, `Strike (Level)`, `Initial Fixing`, `No. of options`, `Option Premium Amount (Original ccy)`, `Client Price`, `Total GNBV (bps)` when present (this row: `strike_pct=136.00%`, `client_price=6.97%`, `total_gnbv_bps=50.9223`) |

## TC04 Illiquid Credit + Repack

Source row highlights:

| Source column | Test value |
|---|---|
| `Product Type` | `Illiquid Credit` |
| `Deal Name` | `Repackaged Illiquid Credit Note` |
| `Trade Date` | `18/07/2026` |
| `FINAL CUSTOMER` | `HASE` |
| `Booking` | `HK` |
| `Ccy` | `USD` |
| `Volume ('MM) USD` | `3` |
| `GNBV (USD)` | `45000` |
| `NNBV` | `40000` |
| `ISIN` | `XS1111111111` |
| `SVCS No.` | `SVCS123` |
| `Maturity` | `18/07/2029` |
| `Trader` | `Credit Trader` |
| `Issuer` | `Issuer Ltd` |
| `BBG Tix 1` | `CRDT` |
| `Reoffer` | `97.5` |
| `Status` | `New` |
| `Remarks` | `illiquid smoke` |

Expected assertions:

| Output field | Expected |
|---|---|
| `*Tier 1 Product Type` | `Structured Credit` |
| `*Tier 2 Product Type` | `Structured Credit` |
| `*Tier 3 Product Type` | `Structured Credit Notes` |
| `*Treats Acronym` | `HASEHKP` |
| `*Trade ID` | Numeric, current smoke value `2810938652` |
| `*$ Volume` | `3000000` |
| `*$ VA/GNBV` | `45000` |
| `Buy/Sell` | **`Sell`** under the default `illiquidStatusToBuySell = new_fee_to_sell` setting, because source `Status` is `New` (regex `/\b(new|fee)\b/i`). Set the `illiquidStatusToBuySell` select to `off` to restore the previous blank behavior. |

## TC05 Structured Credit CLN

Source row highlights:

| Source column | Test value |
|---|---|
| `Product` | `CLN Basket Credit Linked Note` |
| `Category` | `CLN` |
| `Region` | `APAC` |
| `Notional (USD)` | `5000000` |
| `GNBV (USD)` | `100000` |

Expected assertions:

| Output field | Expected |
|---|---|
| `*Tier 1 Product Type` | `Structured Credit` |
| `*Tier 2 Product Type` | `Structured Credit` |
| `*Tier 3 Product Type` | `Credit Linked Notes` |
| `*Trade ID` | Numeric, current smoke value `2635637780` |
| `*$ Volume` | `5000000` |
| `*$ VA/GNBV` | `100000` |
| `Quality` | Fail until Trade Date and other sparse-source fields are supplied by source/rule/reference/manual override |

## TC06 Private Credit

Source row highlights:

| Source column | Test value |
|---|---|
| `Product` | `Private Credit Facility` |
| `Category` | `Private Placement` |
| `Region` | `APAC` |
| `Notional (USD)` | `6000000` |
| `GNBV (USD)` | `120000` |

Expected assertions:

| Output field | Expected |
|---|---|
| `Asset class` | `Private Credit` |
| `*Tier 1 Product Type` | `Private Credit Primary` |
| `*Tier 2 Product Type` | `Private Placement` |
| `*Tier 3 Product Type` | `Private Placement` |
| `*Trade ID` | Numeric, current smoke value `5141050790` |
| `*$ Volume` | `6000000` |
| `*$ VA/GNBV` | `120000` |
| `Quality` | Fail until Trade Date and other sparse-source fields are supplied by source/rule/reference/manual override |

## TC07 Equity TRS

Source row highlights:

| Source column | Test value |
|---|---|
| `Reference number` | `123456` |
| `Product` | `Equity TRS` |
| `Trade Date` | `18/07/2026` |
| `FINAL CUSTOMER` | `Nomura PB` |
| `SALETEAM` | `HK` |
| `Book` | `HK` |
| `Currency` | `USD` |
| `Underlying` | `0700 HK` |
| `Structure` | `Equity TRS` |
| `Maturity` | `18/07/2027` |
| `Settlement Date` | `20/07/2026` |
| `Notional in USD` | `7000000` |
| `MSS Revenue in USD` | `200000` |
| `Total Bank Revenue in USD` | `260000` |
| `Commission to PB (HKD)` | `78000` |
| `FX rate` | `0.128` |
| `Net Price` | `100.2` |
| `New/Unwind` | `New` |
| `No. of shares` | `100000` |

Expected assertions:

| Output field | Expected |
|---|---|
| `*Treats Acronym` | `NOSGSGH` |
| `*Trade ID` | Numeric native value `123456`, source-backed |
| `*$ Volume` | `7000000` |
| `*$ VA/GNBV` | `200000` under default MSS Revenue policy |
| `*$ PC` | `9984` under default `trsFxConvention = multiply` (HKD commission `78000` x FX rate `0.128` = `9984`) |
| `Buy/Sell` | `Buy` |

### TC07 alternate: `trsFxConvention = divide`

Switching the `trsFxConvention` select to `divide` changes the PC formula to `commissionLocal / fx` instead of `commissionLocal * fx`:

| Output field | Expected |
|---|---|
| `*$ PC` | `609375` (`78000 / 0.128`) |

All other TC07 fields (Trade ID, Volume, VA/GNBV, Buy/Sell, Treats) are unchanged by this setting.

## Known Intentional Test Gaps

| Gap | Reason |
|---|---|
| Structured Credit and Private Credit are Fail in smoke | Their sparse source sheet has no `*Trade Date`, `*Salesperson (Coverage)`, `*Legal Entity`, or `*Treats Acronym`. This is expected until PLUTO-required fields are supplied by rules/reference/source fields/manual overrides. |
| Placeholder Treats on non-Nomura/non-HASE rows | Only Nomura Private Bank and HASE were provided as built-in Treats fallbacks. Other clients still need coverage/legal reference data. |
| Illiquid/Repack Buy/Sell defaults to Sell | As of this update, `Status` values matching `new` or `fee` map to `Sell` by default (`illiquidStatusToBuySell = new_fee_to_sell`). Set the select to `off` to restore blank Buy/Sell if the Sell mapping is not desired for a given run. |
| TRS PC FX direction | Both conventions are now implemented and selectable via `trsFxConvention` (`multiply` default, `divide` alternate). Confirm with the business which convention matches the firm's workbook FX direction before final production sign-off. |

## Automated Harness

The scenarios above (including both new-behavior toggle cases) are now exercised automatically by a headless-Chromium test harness under `tests/`. See `docs/test_harness.md` for full details. Quick start:

```
cd tests
npm install        # one-time: fetches Playwright + its Chromium binary
node run_tests.js
```

The harness serves the repo over `http://127.0.0.1:<port>/`, drives the app with `window.__SNAPSHOT_MODE = true`, uploads `ocr_work/test_non_linear_taxonomy.xlsx`, toggles `illiquidStatusToBuySell` and `trsFxConvention` across three scenarios (default settings, Illiquid `off`, TRS `divide`), and asserts against `tests/expected.js`. It exits non-zero on any failed assertion. The latest run's full PASS/FAIL report is saved at `ocr_work/automated_test_run.log` (81/81 assertions passing as of this update, with all documented trade IDs unchanged).

For a complete-input, best-case audit of all 13 starred PLUTO fields across every asset class (using `window.__BOARD_STAR_AUDIT()` and a separate, fuller fixture), see `docs/starred_field_gap_report.md` and `tests/run_starred_field_matrix.js` (`npm run test:matrix`) -- it documents exactly which asset classes reach full real coverage and which cannot, and why.
