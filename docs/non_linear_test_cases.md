# Non-Linear Mapper Test Cases

Generated: 2026-07-18. Updated: 2026-07-19 for the OCR-restored selected-sheet workflow.  
Primary workbook fixture: `ocr_work/test_non_linear_taxonomy.xlsx`; TC01B is generated inside the selected-sheet smoke harness to isolate the current Structured FI product-branching rows.
Browser smoke log: `ocr_work/non_linear_taxonomy_smoke.log`  
Browser smoke screenshot: `ocr_work/non_linear_taxonomy_smoke.png`  
Restoration note: `docs/restored_ocr_workflow.md`

These are the minimum one-row-per-family test cases currently wired into the mapper smoke test. The rows are intentionally small and focused: each one proves a specific branch while preserving the existing zero-linear path.

PLUTO means the output template. Every output field beginning with `*` has to be populated for PLUTO readiness, including `*$ Volume`. Rows with intentionally sparse source data can still prove parser behavior, but they remain Fail until the missing starred PLUTO fields are supplied by source columns, reference data, Mapping Studio rules, or manual overrides.

## Test Case Summary

| ID | Source sheet | Scenario | Expected status |
|---|---|---|---|
| TC01 | `Structured FI 2026` | Current Structured FI layout with CLN text and Nomura Private Bank client | Clean Pass |
| TC01B | `Structured FI Product Taxonomy` | Current Structured FI layout product branching for Linear Zero Callable Notes, Range Accrual with Conversion, and CLN priority | Clean Pass |
| TC02 | `Linear Zero` | Existing zero-linear layout using accepted aliases | Clean Pass |
| TC02B | `Linear Zero Traded` | Legacy zero-linear layout with CLN wording in product text | Clean Pass |
| TC03 | `Collar Blotter` | Collar strategy row with HASE client and PB Fee PC | Clean Pass |
| TC04 | `Illiquid Credit+Repack` | Illiquid/Repack row with Repackaged text and HASE client | Clean Pass |
| TC05 | `Structured Credit 2025` | CLN Structured Credit row with sparse source columns | Fail until missing starred PLUTO fields are supplied |
| TC06 | `Structured Credit 2025` | Private Credit / Private Placement row with sparse source columns | Fail until missing starred PLUTO fields are supplied |
| TC07 | `Equity TRS` | TRS row with numeric native reference and Nomura PB client | Clean Pass |

## Expected Output Matrix

| ID | Expected asset class | Tier 1 | Tier 2 | Tier 3 | Treats | Trade ID behavior | Key expected outputs |
|---|---|---|---|---|---|---|---|
| TC01 | Structured FI - Credit | Structured Credit | Structured Credit | Credit Linked Notes | `NOSGSGH` | Business-key numeric smoke ID `2484390147`; native ref remains in ISIN Code | Trade Date `23/02/2026`; Primary CCY `USD`; `*$ Volume` `1000000`; VA/GNBV `10742`; PC defaults to `0`; Comment blank, matching Linear Zero output plumbing. |
| TC01B-A | Structured FI - Rate | Structured Rates | Interest Rate Linked Note -PPN | Interest Rate Linked Note -PPN | `HASEHKP` | Numeric deterministic ID | Current-layout `Product = Linear Zero Callable Notes` uses the original zero-linear tier taxonomy; `Addon` maps to `Sell`. |
| TC01B-B | Structured FI - Rate | Structured Rates | Interest Rate Linked Note -PPN | Range Accrual with Conversion | `HASEHKP` | Numeric deterministic ID | Current-layout `Product = Range Accrual with Conversion` differentiates tier 3 while remaining in the Structured FI rates family; `Unwind` maps to `Buy`. |
| TC01B-C | Structured FI - Credit | Structured Credit | Structured Credit | Credit Linked Notes | `NOSGSGH` | Numeric deterministic ID | Current-layout `Product` containing `CLN`, for example `YieldEnhancedCLNRangeAccrual`, wins over `Structure = Range Accrual with Conversion`; `New` maps to `Sell`. |
| TC02 | Structured FI - Rate | Structured Rates | Interest Rate Linked Note -PPN | Interest Rate Linked Note -PPN | `HRCHHKH` | Business-key numeric smoke ID `2984344667`; native ref remains in ISIN Code | Trade Date `18/07/2026`; Primary CCY `USD`; `*$ Volume` `2000000`; VA/GNBV `2500`; PC defaults to `0`; output Comment blank. |
| TC02B | Structured FI - Rate | Structured Rates | Interest Rate Linked Note -PPN | Interest Rate Linked Note -PPN | `HRCHHKH` | Numeric deterministic ID; native ref remains in ISIN Code | Same legacy zero-linear economics as TC02; confirms CLN/free-text product wording does not override the original OCR Linear Zero tier logic. |
| TC03 | Collar | Equity Derivatives | Equity Derivatives | Collar / Options | `HASEHKP` | Business-key numeric smoke ID `4416263868`; native ref remains traceable | Trade Date `31/10/2023`; `*$ Volume` `4613500`; VA/GNBV `23493`; PC `46135`; Buy/Sell `Sell` from `New`. |
| TC04 | Illiquid Credit | Structured Credit | Structured Credit | Structured Credit Notes | `HASEHKP` | Business-key numeric smoke ID `4286094171`; native ref in Comment and ISIN Code | Trade Date `18/07/2026`; `*$ Volume` `3000000`; VA/GNBV `45000`; PC defaults to `0`; Status retained in Comment; Buy/Sell `Sell` under default `illiquidStatusToBuySell=new_fee_to_sell` setting (Status "New"). |
| TC05 | Structured Credit | Structured Credit | Structured Credit | Credit Linked Notes | Placeholder unless reference/rule supplied | Business-key numeric smoke ID `1739969105` | Primary CCY `USD`; `*$ Volume` `5000000`; VA/GNBV `100000`; Trade Date blank by source limitation. |
| TC06 | Private Credit | Private Credit Primary | Private Placement | Private Placement | Placeholder unless reference/rule supplied | Business-key numeric smoke ID `3173193476` | Primary CCY `USD`; `*$ Volume` `6000000`; VA/GNBV `120000`; Trade Date blank by source limitation. |
| TC07 | Equity TRS | Equity Derivatives | Equity Derivatives | Total Return Swap | `NOSGSGH` | Business-key numeric smoke ID `4271065392`; `native_ref_preferred` mode can pass through native `123456` | Trade Date `18/07/2026`; `*$ Volume` `7000000`; VA/GNBV `200000` by MSS policy; PC `9984` by HKD commission x FX; Buy/Sell `Sell` from `New`. |

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
| `*Trade ID` | Numeric, current selected-sheet smoke value `2484390147` in `business_key` mode |
| `Price` | `98.5` from `First Reoffer = 98.50%` |
| `Comment` | Blank, matching the OCR Linear Zero output behavior. Source layout remains available in the automation snapshot, not in the PLUTO output row. |

## TC01B Structured FI Current Layout / Product Branching

This generated smoke fixture keeps the current consolidated Structured FI column layout and changes only the `Product`/`Structure` signals.

| Row | Product / Structure signal | Expected tiers | Notes |
|---|---|---|---|
| A | `Product = Linear Zero Callable Notes`; `Structure = Linear Zero Callable Notes` | `Structured Rates / Interest Rate Linked Note -PPN / Interest Rate Linked Note -PPN` | Uses the old zero-linear product taxonomy even though the input layout is `structured_fi_current`. |
| B | `Product = Range Accrual with Conversion`; `Structure = Range Accrual with Conversion` | `Structured Rates / Interest Rate Linked Note -PPN / Range Accrual with Conversion` | Follows the rates family and differentiates tier 3. |
| C | `Product = YieldEnhancedCLNRangeAccrual`; `Structure = Range Accrual with Conversion` | `Structured Credit / Structured Credit / Credit Linked Notes` | `ifexists(CLN)` priority avoids being misclassified as Range Accrual. |

Each row includes current-layout columns `ISIN Front`, `SALETEAM`, `First Trade Date`, `FINAL CUSTOMER`, `Book`, `Currency`, `Maturity`, `Total NNBV`, `First Reoffer`, `Volume ('MM) USD`, `Trader`, `Issuer`, and `Product Type`, and each row asserts numeric `*Trade ID`. These rows intentionally keep the OCR Linear Zero optional-field behavior: output Comment, Book, Security, Trader, and Ticker stay blank unless a user rule/manual override fills them.

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
| `*Tier 1 Product Type` | `Structured Rates` |
| `*Tier 2 Product Type` | `Interest Rate Linked Note -PPN` |
| `*Tier 3 Product Type` | `Interest Rate Linked Note -PPN` |
| `*$ Volume` | `2000000` |
| `*$ VA/GNBV` | `2500` |
| `*Trade ID` | Numeric, current selected-sheet smoke value `2984344667` in `business_key` mode |
| `Price` | `99.1` from `Reoffer = 99.1`; decimal regression uses `0.991` and must also output `99.1` |
| `Comment` | Blank, matching the OCR Linear Zero output behavior. |

Regression assertion for `Linear Zero Traded`:

If the same legacy source structure contains product/security text like `CLN Credit Linked Note`, it must still produce:

| Output field | Expected |
|---|---|
| `Asset class` | `Structured FI - Rate` |
| `*Tier 1 Product Type` | `Structured Rates` |
| `*Tier 2 Product Type` | `Interest Rate Linked Note -PPN` |
| `*Tier 3 Product Type` | `Interest Rate Linked Note -PPN` |
| `Price` | `99.1` from decimal `Reoffer = 0.991` |
| `Comment` | Blank; no `Markets` tier fallback should appear |

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
| `*Trade ID` | Numeric, current selected-sheet smoke value `4416263868` in `business_key` mode |
| `*$ Volume` | `4613500` |
| `*$ VA/GNBV` | `23493` |
| `*$ PC` | `46135` |
| `Buy/Sell` | `Sell` |
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
| `*Trade ID` | Numeric, current selected-sheet smoke value `4286094171` in `business_key` mode |
| `*$ Volume` | `3000000` |
| `*$ VA/GNBV` | `45000` |
| `Price` | `97.5`; decimal regression uses `Reoffer = 0.975` and must also output `97.5` |
| `*$ PC` | `0` by default unless a PC reference/rule is supplied. |
| `Buy/Sell` | **`Sell`** under the default `illiquidStatusToBuySell = new_fee_to_sell` setting, because source `Status` is `New`. The same policy maps `Addon`/`Add-on`/`Fee` to `Sell` and `Unwind` to `Buy`; set the select to `off` to restore blank Buy/Sell. |

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
| `*Trade ID` | Numeric, current selected-sheet smoke value `1739969105` in `business_key` mode |
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
| `*Trade ID` | Numeric, current selected-sheet smoke value `3173193476` in `business_key` mode |
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
| `*Trade ID` | Numeric selected-sheet smoke value `4271065392` in `business_key` mode; switching Trade ID mode to `native_ref_preferred` can pass through native `123456` |
| `*$ Volume` | `7000000` |
| `*$ VA/GNBV` | `200000` under default MSS Revenue policy |
| `*$ PC` | `9984` under default `trsFxConvention = multiply` (HKD commission `78000` x FX rate `0.128` = `9984`) |
| `Buy/Sell` | `Sell` |

### TC07 alternate: `trsFxConvention = divide`

Switching the `trsFxConvention` select to `divide` changes the PC formula to `commissionLocal / fx` instead of `commissionLocal * fx`:

| Output field | Expected |
|---|---|
| `*$ PC` | `609375` (`78000 / 0.128`) |

All other TC07 fields (Trade ID, Volume, VA/GNBV, Buy/Sell, Treats) are unchanged by this setting.

## Known Intentional Test Gaps

| Gap | Reason |
|---|---|
| Structured Credit and Private Credit are Fail in smoke | Their sparse source sheet has no `*Trade Date`. This is expected until PLUTO-required fields are supplied by rules/reference/source fields/manual overrides. |
| Placeholder Treats on non-Nomura/non-HASE rows | Only Nomura Private Bank and HASE were provided as built-in Treats fallbacks. Other clients still need coverage/legal reference data. |
| Default PC is 0 | Structured FI, Illiquid/Repack, Structured Credit, and Private Credit now default `*$ PC` to `0` unless a PC reference/rule/source candidate exists. Collar still uses `PB Fee (USD)` first; TRS still uses commission first. |
| Buy/Sell action convention | `New`, `Addon`/`Add-on`, and `Fee` map to `Sell`; `Unwind` maps to `Buy`. Set Illiquid/Repack status mapping to `off` to restore blank Buy/Sell for that family. |
| TRS PC FX direction | Both conventions are now implemented and selectable via `trsFxConvention` (`multiply` default, `divide` alternate). Confirm with the business which convention matches the firm's workbook FX direction before final production sign-off. |

## Automated Harness Status

Current verified path for this document is the selected-sheet browser smoke described in `docs/restored_ocr_workflow.md`: load `ocr_work/test_non_linear_taxonomy.xlsx`, process each target worksheet one at a time, and confirm the snapshot only contains rows from that selected worksheet.

The starred-field matrix harness has also been rewritten for the OCR-restored selected-sheet flow. It processes each target matrix worksheet one at a time and confirms the 13 PLUTO required `*` fields by asset family, with documented gaps separated from unexpected failures.

Harness quick start:

```
cd tests
npm install        # one-time: fetches Playwright + its Chromium binary
node run_tests.js
```

The old harness serves the repo over `http://127.0.0.1:<port>/`, drives the app with `window.__SNAPSHOT_MODE = true`, uploads `ocr_work/test_non_linear_taxonomy.xlsx`, and expects all workbook sheets to be parsed together. That expectation is intentionally obsolete.

For a complete-input, best-case audit of all 13 starred PLUTO fields across every asset class (using `window.__BOARD_STAR_AUDIT()` and a separate, fuller fixture), see `docs/starred_field_gap_report.md` and `tests/run_starred_field_matrix.js` (`npm run test:matrix`) -- it documents exactly which asset classes reach full real coverage and which cannot, and why.
