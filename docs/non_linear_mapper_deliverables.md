# Non-Linear Mapper Deliverables

Generated: 2026-07-18  
App: `centralised_blotter_mapping_studio.html`

## Objective

Expand the mapper beyond the original Linear Zero / Structured FI flow so Structured FI, CLN, Repackaged + Illiquid Credit, Private Credit, Collar, and Equity TRS can land in the central output template with fewer pending fields, while preserving the existing zero-linear functionality and firm connections.

## Source Evidence

- Structured FI and Collar source-template evidence: `ocr_work/supplied_source_templates/structured_fi_collar_columns_example.jpg`
- Output-template header evidence: `ocr_work/supplied_source_templates/output_template_headers.jpg`
- Detailed source inventory: `docs/non_linear_template_inventory.md`
- Test cases: `docs/non_linear_test_cases.md`
- Current coverage report: `ocr_work/current_mapping_coverage.md`
- OCR workflow restoration note: `docs/restored_ocr_workflow.md`

## What We Had Before

| Area | Existing behavior to preserve |
|---|---|
| Linear Zero / Structured FI lineage | Existing Structured FI parser, source columns, date output, amount derivation, VA/GNBV derivation, native-reference preference, and output-template order. |
| Firm connections | Template source endpoint, saved-profile firm DB endpoint, user endpoint, SQL table, icon, and CDN dependencies. Local fallback remains fallback only. |
| Output template | The central target columns remain the template contract. `*$ Volume` is the PLUTO amount column. |
| PLUTO required fields | Every output-template field beginning with `*` has to be populated for PLUTO readiness, including `*$ Volume`. |
| Mapping Studio | User rules, reference CSVs, manual overrides, saved settings, and field provenance still override built-in defaults where configured. |
| Collar | Existing strategy/leg grain switch, PB Fee PC waterfall, GNBV aggregation, and New/Unwind Buy/Sell mapping. |
| Illiquid/Repack | Existing Product Type / Deal Name parsing, ISIN/SVCS native source reference, GNBV/NNBV logic, Status retained in Comment. |
| Equity TRS | Existing Reference number, Notional in USD, MSS/Bank revenue policy, Commission to PB PC waterfall, and New/Unwind mapping. |

## What The New Information Adds

| New instruction | Mapping now required |
|---|---|
| Current Structured FI Linear Zero Callable Notes taxonomy | `Product = Linear Zero Callable Notes` maps to `*Tier 1 Product Type = Structured Rates`; `*Tier 2 Product Type = Interest Rate Linked Note -PPN`; `*Tier 3 Product Type = Interest Rate Linked Note -PPN`, matching the original zero-linear taxonomy. |
| Current Structured FI Range Accrual with Conversion taxonomy | `Product = Range Accrual with Conversion` maps to `*Tier 1 Product Type = Structured Rates`; `*Tier 2 Product Type = Interest Rate Linked Note -PPN`; `*Tier 3 Product Type = Range Accrual with Conversion`. |
| CLN taxonomy | `*Tier 1 Product Type = Structured Credit`; `*Tier 2 Product Type = Structured Credit`; `*Tier 3 Product Type = Credit Linked Notes`. |
| Repackaged + Illiquid Credit taxonomy | `*Tier 1 Product Type = Structured Credit`; `*Tier 2 Product Type = Structured Credit`; `*Tier 3 Product Type = Structured Credit Notes`. |
| Private Credit taxonomy | `*Tier 1 Product Type = Private Credit Primary`; `*Tier 2 Product Type = Private Placement`; `*Tier 3 Product Type = Private Placement`. |
| Nomura Private Bank Treats | `*Treats Acronym = NOSGSGH` when the client/source text identifies Nomura Private Bank or Nomura PB and no reference CSV value overrides it. |
| HASE Treats | `*Treats Acronym = HASEHKP` when the client/source text identifies HASE or Hang Seng and no reference CSV value overrides it. |
| Numeric Trade ID | The output template `*Trade ID` should be a number. Alphanumeric native references such as ISIN, OTC ISIN, PIMS, or synthetic string IDs stay traceable in `ISIN Code` and/or `Comment`. |
| Current Structured FI layout | Add a current-layout Structured FI branch/alias set for columns such as `ISIN Front`, `SALETEAM`, `First Trade Date`, `FINAL CUSTOMER`, `Volume ('MM) USD`, `Total NNBV`, `First Reoffer`, `Product Type`. |
| Preserve zero-linears | Keep older Linear Zero aliases such as `Linear Zero Traded`, `Linear Zero`, `Structured FI`, `Structured FI / Linear Zero`, `Date`, `Client`, `Security`, `Notional USD Mio`, and related headers. |
| Preserve Linear Zero tier defaults | `*Tier 1 Product Type = Structured Rates`; `*Tier 2 Product Type = Interest Rate Linked Note -PPN`; `*Tier 3 Product Type = Interest Rate Linked Note -PPN`. |
| Remove generic Markets fallback | No asset family should fall back to `Markets`; unrecognized taxonomy stays explicit rather than invented. |

## Implemented Deliverables

| Deliverable | Status | Implementation note |
|---|---|---|
| D1: Preserve firm/template connections | Done | No firm URLs/endpoints removed. Existing local fallback remains. |
| D2: Preserve existing Linear Zero / Structured FI behavior | Done | The parser still accepts existing Structured FI sheets and now also scans optional Linear Zero sheet aliases without double-parsing already matched sheets. |
| D3: Add current Structured FI layout condition | Done | Rows are tagged internally as `structured_fi_current` or `linear_zero_existing`; this appears in `Comment` for audit. |
| D4: Add Structured FI product-specific taxonomy | Done | Current-layout Structured FI rows branch on `Product`: Linear Zero Callable Notes gets the OCR Linear Zero tiers; Range Accrual with Conversion differentiates tier 3; `ifexists(CLN)` gets Structured Credit tiers and wins over Range Accrual wording when both appear. Product reference CSV still wins. |
| D5: Add Repackaged + Illiquid Credit taxonomy | Done | Built-in policy taxonomy applies when source text indicates Repack/Repackaged/Illiquid Credit. |
| D6: Add Private Credit taxonomy | Done | Structured Credit rows matching Private Credit or Private Placement are scoped as `Private Credit` and get the requested tier values. |
| D7: Add Nomura/HASE Treats fallback | Done | Coverage/legal reference values still win; built-in Treats is used only when references do not resolve. |
| D8: Make template `*Trade ID` numeric | Done | Numeric native references remain numeric; alphanumeric references produce a deterministic numeric hash. Native source references are retained in Comment and ISIN fields where applicable. |
| D9: Enforce PLUTO starred-field readiness | Done | All template fields beginning with `*` are treated as required. Rows with blank required fields fail; rows with working placeholders are not Clean Pass. |
| D10: Document mapping and gaps | Done | This document plus `docs/non_linear_template_inventory.md`, `docs/non_linear_test_cases.md`, and `ocr_work/current_mapping_coverage.md`. |
| D11: Restore OCR-original selected-sheet workflow | Done | `Load Workbook` only loads sheet names; `Process selected sheet` maps exactly one worksheet. Original tabs restored. See `docs/restored_ocr_workflow.md`. |
| D12: Restore OCR Linear Zero tier defaults | Done | Linear Zero now maps to `Structured Rates / Interest Rate Linked Note -PPN / Interest Rate Linked Note -PPN`, not `Markets`. |

## PLUTO Mandatory Field Policy

PLUTO means the central output template. Any field whose output header begins with `*` has to be populated before a row is PLUTO-ready.

Required PLUTO fields in the current template:

| Field | Population rule |
|---|---|
| `*Salesperson (Coverage)` | Coverage reference, rule, manual override, else configurable default (`defaultSalesperson`, default `mark lok leung`). Always populated. |
| `*Tier 1 Product Type` | Product reference or built-in/default taxonomy. |
| `*Tier 2 Product Type` | Product reference or built-in/default taxonomy. |
| `*Tier 3 Product Type` | Product reference or built-in/default taxonomy. |
| `*Trade Date` | Source date or rule, emitted as `dd/mm/yyyy`. |
| `*Primary CCY` | Source currency or rule. |
| `*Legal Entity` | Legal reference, rule, manual override, else configurable default (`defaultLegalEntity`, default `HBAP`, learned from Linear Zero). Always populated. |
| `*Treats Acronym` | Coverage/legal reference, built-in Nomura/HASE client fallback, else Linear Zero booking-site routing (SG -> `HRCHSGH`, HK -> `HRCHHKH`), rule, manual override, or working placeholder only when no client and no SG/HK book resolves. |
| `*$ Volume` | Source amount derivation or rule. Required by PLUTO. |
| `*$ PC` | PC waterfall, PC reference, policy rule, or override. |
| `*$ VA/GNBV` | Source VA/GNBV derivation or rule. |
| `*Trade ID` | Numeric output ID. |
| `*Revenue CCY` | Default `USD` unless overridden. |

Rows with blank PLUTO-required fields are `Fail`. Rows that rely on `PENDING_*` placeholders can be used for working review, but they are not clean PLUTO-ready rows.

## Trade ID Design

The output field `*Trade ID` is now numeric by construction:

- If the native source reference is already all digits and safe as a JavaScript integer, it is used directly as a number.
- If the native source reference is alphanumeric, the app creates a deterministic numeric ID from the native reference plus source sheet/row/asset/date/client/book/currency/amount context.
- The alphanumeric native reference remains available in `ISIN Code` where appropriate and in `Comment` as `native_trade_ref=...`.
- The internal row key remains the original source/native/synthetic string so existing manual overrides and row editor behavior are not broken.

This keeps the export contract numeric while preserving operational traceability.

## Product Taxonomy Precedence

Product tiers resolve in this order:

1. Product reference CSV or Mapping Studio user rule.
2. Built-in taxonomy from this instruction: Private Credit, CLN, Repackaged/Illiquid Credit.
3. Existing asset-class defaults.
4. Product/Structure fallback for unknown Structured FI.
5. Working-mode placeholder only where the field is still unresolved and placeholders are allowed.

## Treats Precedence

`*Treats Acronym` resolves in this order:

1. Coverage reference CSV.
2. Legal reference CSV.
3. Built-in client mapping: Nomura Private Bank -> `NOSGSGH`; HASE/Hang Seng -> `HASEHKP`.
4. Linear Zero booking-site routing by Book, then Sales Team: SG (`singapore`/`sgh`/`sg`) -> `HRCHSGH`; HK (`hong kong`/`hkh`/`hk`) -> `HRCHHKH`.
5. Working-mode placeholder only if still unresolved and placeholders are allowed.

## Remaining Decisions

| Decision | Why it remains open |
|---|---|
| Illiquid/Repack `Status` to Buy/Sell | Current mapping keeps Status in Comment and leaves Buy/Sell blank unless a rule says otherwise. |
| TRS FX convention | Current PC logic multiplies HKD commission by FX rate; confirm if the source rate is inverse. |
| Legal/Salesperson reference gaps | `*Legal Entity`, `Site Code`, `Salesperson`, platform, PC code, CVA/FVA, Risk Book, and TFX still require reference CSVs or firm rules for full clean-pass output. |
| Product-specific economics destination | Coupon, Range, Strike, Initial Fixing, No. of options, and Option Premium are source evidence but not target-template columns unless placed into Comment or future fields. |

## Verification Requirements

- Syntax-check embedded scripts after each mapper change.
- Smoke-test with at least one row for Structured FI current layout, existing Linear Zero layout, CLN, Illiquid/Repack, Private Credit, Collar, and Equity TRS.
- Confirm `*Trade ID` exports as a numeric value in XLSX for every asset family.
- Confirm native references remain traceable in `ISIN Code` or `Comment`.
- Confirm existing Linear Zero workbook layouts still parse and map to the same output fields.

## Verification Completed

| Check | Result |
|---|---|
| Embedded script syntax | Passed: embedded app script compiles. |
| Browser selected-sheet smoke | Passed with `ocr_work/test_non_linear_taxonomy.xlsx`; each original asset/worksheet was processed one at a time. |
| OCR tab restoration | Passed: visible tabs are Overview, Mapping Studio, Processed Sheet, Exceptions, Golden Record, Default Rules, Saved Settings, Activity Log. |
| Selected-sheet isolation | Passed: every smoke process produced rows only from the selected worksheet. |
| PLUTO mandatory `*` fields | Passed: rows with blank starred PLUTO fields remain Fail; no source values are invented. |
| Numeric `*Trade ID` | Passed: all selected-sheet smoke rows show numeric output IDs. |
| Structured FI product taxonomy | Passed: current-layout Linear Zero Callable Notes, Range Accrual with Conversion, and embedded-CLN substring priority over range wording. |
| CLN taxonomy | Passed: Structured Credit / Structured Credit / Credit Linked Notes. |
| Illiquid/Repack taxonomy | Passed: Structured Credit / Structured Credit / Structured Credit Notes. |
| Private Credit taxonomy | Passed: Private Credit Primary / Private Placement / Private Placement. |
| Nomura/HASE Treats | Passed: Nomura Private Bank -> `NOSGSGH`; HASE -> `HASEHKP`. |
| Existing Linear Zero preservation | Passed: `Linear Zero` sheet parsed as `linear_zero_existing` and mapped as Clean Pass in the selected-sheet smoke. |
| Remaining known source gap | `Structured Credit 2025` sparse fixture maps taxonomy/amounts but still lacks source `*Trade Date`; see `docs/restored_ocr_workflow.md`. |

Smoke artifacts:

- `docs/non_linear_test_cases.md`
- `ocr_work/test_non_linear_taxonomy.xlsx`
- `ocr_work/non_linear_taxonomy_smoke.log`
- `ocr_work/non_linear_taxonomy_smoke.png`
