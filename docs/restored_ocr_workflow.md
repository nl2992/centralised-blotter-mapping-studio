# Restored OCR Workflow

Updated: 2026-07-19  
App: `centralised_blotter_mapping_studio.html`

## Source Of Truth

The original OCR-ed reconstruction is in:

- `ocr_work/stitched_ocr_raw.txt`
- `ocr_work/raw_text/IMG_7327.txt`, `IMG_7328.txt`, `IMG_7329.txt` for the recovered page-199 control binding
- `ocr_work/render_dom.html` for the earlier runnable snapshot

The OCR-original flow is now treated as the product behavior source of truth.

## What We Broke In The Centralised Rewrite

| Area | Broken rewrite behavior | Restored behavior |
|---|---|---|
| Workbook processing | Parsed the whole workbook and all recognized sheets at once. | Load workbook only, then process one selected worksheet. |
| Top workflow controls | Removed/obscured Asset, Worksheet, run mode, Trade ID mode, and Process selected sheet. | Restored Asset, Worksheet, Run mode, Add-on window, Trade ID mode, and Process selected sheet. |
| Control availability | Static controls stayed clickable even when no workbook was loaded, and unsupported run modes stayed visible. | Worksheet and Process are disabled until a workbook/sheet exists; run modes are generated from the selected asset; the add-on window appears only for Structured FI aggregate mode. |
| Remapping flow | Run-mode changes often reread the selected worksheet. | Selected-sheet parse stores source rows once; run mode, Trade ID mode, and add-on window changes remap/re-aggregate the current rows without rereading the workbook. |
| Tab layout | Replaced the original tab set with Template Mapping, Reconciliation, Diagnostics, Canonical Rows, Field Matrix, References, Governance, Settings, Debug Log. | Restored Overview, Mapping Studio, Processed Sheet, Exceptions, Golden Record, Default Rules, Saved Settings, Activity Log. |
| Processed sheet | Output review moved into other mapping/debug views. | Restored a Processed Sheet grid with inline PLUTO output editing and row selection for export. |
| Export selection | Export gate acted over all mapped rows, and the Processed Sheet lost filtered/top-N/bottom-N selection tools. | Export first respects selected rows from Processed Sheet, then applies the final gate. Filtered selection, keep first/last N, invert filtered, and reset selection are restored. |
| Golden record | Label existed, but no usable Golden Record tab. | Restored Golden Record storage keyed by numeric `*Trade ID`, with source and PLUTO output panes. |
| Activity log | Debug log existed as a secondary tab. | Restored Activity Log as the visible operational log. |

Hidden audit/helper functions for diagnostics, canonical rows, reconciliation, and governance still exist for engineering/test support, but they are no longer part of the user-facing tab set.

## Current Tabs

| Tab | What it shows / does |
|---|---|
| Overview | Current selected-sheet processing KPIs, export buttons, and asset summary chart. |
| Mapping Studio | Field-level source-to-PLUTO rule editor. User rules and manual rules still override built-in defaults. |
| Processed Sheet | The selected worksheet's mapped PLUTO rows. Supports inline cell edits, row include/exclude selection, CSV export, and XLSX export. |
| Exceptions | Mandatory starred-field failures and data-quality warnings for the current processed sheet. |
| Golden Record | Latest mapped output by numeric `*Trade ID`, including source summary and PLUTO output JSON. |
| Default Rules | Current asset/run settings plus the built-in/default PLUTO field wiring and manual rule status. |
| Saved Settings | Firm/local profile store, JSON import/export, rules import/export, and manual override persistence. Firm endpoints are preserved. |
| Activity Log | Operational log for workbook load, selected-sheet processing, settings changes, rule imports, and export events. |

## Asset Dropdown

The restored visible Asset dropdown has the original four choices:

| Asset choice | Parser path |
|---|---|
| Structured FI / Linear Zero | `parseStructuredFi`; also routes `Structured Credit 2025` by header signature when selected under this asset. |
| Collar | `parseCollar` using the current collar row-grain setting. |
| Illiquid Credit + Repack | `parseIlliquid`. |
| Equity TRS | `parseTrs`. |

Only the selected worksheet is processed. Changing Asset can auto-select the best matching worksheet, but it does not require workbook-wide parsing.

## Mapping Additions Preserved

| Instruction | Current mapping |
|---|---|
| Linear Zero default | `Structured Rates / Interest Rate Linked Note -PPN / Interest Rate Linked Note -PPN`, preserved from the OCR-original board. When the source row is recognized as the legacy Linear Zero layout, product text such as `CLN` or `Credit Linked Note` does not trigger the newer product taxonomy. |
| Current Structured FI `Product = Linear Zero Callable Notes` | `Structured Rates / Interest Rate Linked Note -PPN / Interest Rate Linked Note -PPN`, matching the original zero-linear taxonomy even though the row is in the consolidated Structured FI layout. |
| Current Structured FI `Product = Range Accrual with Conversion` | `Structured Rates / Interest Rate Linked Note -PPN / Range Accrual with Conversion`; this follows the Structured FI rates family but differentiates tier 3 by product. |
| CLN | `Structured Credit / Structured Credit / Credit Linked Note`. This uses `ifexists(CLN)`, so embedded values such as `YieldEnhancedCLNRangeAccrual` classify as CLN; CLN wins when both `CLN` and `Range Accrual with Conversion` appear in the same current-layout Structured FI row. |
| Repackaged + Illiquid Credit | `Structured Credit / Structured Credit / Structured Credit Notes`. |
| Private Credit | `Private Credit Primary / Private Placement / Private Placement`. |
| Collar | `Equity Derivatives / Equity Derivatives / Collar / Options`. |
| Equity TRS | `Equity Derivatives / Equity Derivatives / Total Return Swap`. |
| Nomura Private Bank Treats | `NOSGSGH`, unless a coverage/legal reference overrides it. |
| HASE / Hang Seng Treats | `HASEHKP`, unless a coverage/legal reference overrides it. |
| PB routing | SG -> `HRCHSGH`; HK -> `HRCHHKH`, preserved from the original Linear Zero logic. |
| Numeric `*Trade ID` | All modes export a numeric value. Native alphanumeric refs remain traceable in `ISIN Code` and/or `Comment`. |
| PLUTO starred fields | Every output header beginning with `*` is required for clean PLUTO readiness. |

## Linear Zero Regression Contract

For sheets with the original zero-linear column structure, including `Linear Zero Traded`, `Linear Zero`, and equivalent aliases with columns such as `Date`, `Client`, `Security`, `Product`, `Notional USD Mio`, `NNBV`, `Reoffer`, `Ticker`, and `Maturity Date`, the app uses the original OCR path:

- Source layout is tagged as `linear_zero_existing`.
- Asset class is locked to `Structured FI - Rate`.
- Product tiers are locked to `Structured Rates / Interest Rate Linked Note -PPN / Interest Rate Linked Note -PPN`.
- The newer CLN/Repack/Private Credit taxonomy is not applied to that legacy layout, even if those words appear in free-text product/security fields.
- There is no generic `Markets` tier fallback for this path.

Current Structured FI rows with the newer aggregate WSG/Structured FI columns, such as `ISIN Front`, `SALETEAM`, `First Trade Date`, `FINAL CUSTOMER`, and `Volume ('MM) USD`, still use the multi-asset taxonomy where the supplied Linear Zero Callable Notes, Range Accrual with Conversion, CLN, Repack, and Private Credit mappings apply.

## Processed Sheet Regression Contract

OCR pages around the Processed Sheet showed a richer editor than the simplified centralised rebuild. The restored behavior now includes:

- Search/filter across the current processed output sheet.
- Select filtered rows, clear filtered rows, invert filtered rows, and reset all row selection.
- Keep first N filtered rows and keep last N filtered rows for export selection.
- Export CSV/XLSX buttons that use selected rows first, then the active final export gate.
- Click-to-edit processed cells instead of always-on rigid inputs.
- Selected-cell status, clear selected-cell manual edit, and clear all manual edits for the current sheet.

The selected-sheet smoke test now exercises these controls on the two-row `Structured Credit 2025` case so this does not quietly regress again.

## Reoffer Price Contract

The OCR-original helper `normalizePricePoints` treated reoffer values as price points:

- `98.50%` -> `98.5`
- `98.5` -> `98.5`
- `0.985` -> `98.5`

That behavior is restored for Structured FI / Linear Zero `First Reoffer` / `Reoffer` and Illiquid/Repack `Reoffer`. TRS `Net Price` / `Gross Price` stays a direct numeric source price because the OCR mapping described that as source-backed rather than reoffer-normalized.

## Export File Names

PLUTO CSV/XLSX exports use the selected asset, selected worksheet, and browser-local timestamp:

`pluto_export_<asset>_<worksheet>_<YYYYMMDD_HHMMSS>.csv`  
`pluto_export_<asset>_<worksheet>_<YYYYMMDD_HHMMSS>.xlsx`

Example: `pluto_export_Structured_FI_Linear_Zero_Linear_Zero_Traded_20260719_213045.xlsx`.

## Trade ID Modes

| Mode | Numeric output behavior |
|---|---|
| Deterministic business-key ID | Numeric hash from source sheet, asset, date, client, book, currency, amount, product/security, and maturity. |
| Deterministic native-ref preferred ID | Native numeric references pass through; alphanumeric refs use a deterministic numeric hash retaining the native ref in comments/source fields. |
| Legacy row-order ID | Numeric source row number when available, else deterministic numeric fallback. |

## Current Smoke Test Cases

Fixture: `ocr_work/test_non_linear_taxonomy.xlsx`

| Asset | Worksheet | Rows | Result |
|---|---|---:|---|
| Structured FI / Linear Zero | `Structured FI 2026` | 1 | Clean Pass; CLN taxonomy; numeric Trade ID. |
| Structured FI / Linear Zero | `Structured FI Product Taxonomy` | 3 | Current-layout product branching: Linear Zero Callable Notes, Range Accrual with Conversion, and embedded-CLN priority over range text. |
| Structured FI / Linear Zero | `Linear Zero` | 1 | Clean Pass; existing zero-linear aliases and OCR tier defaults preserved. |
| Structured FI / Linear Zero | `Linear Zero Traded` | 1 | Regression pass; legacy zero-linear structure stays `Structured FI - Rate` and OCR tier defaults even when product text contains CLN wording. |
| Structured FI / Linear Zero | `Structured Credit 2025` | 2 | Taxonomy works for CLN and Private Credit; sparse source still lacks `*Trade Date`. |
| Collar | `Collar Blotter` | 1 | Clean Pass; strategy grain; PB Fee PC; numeric Trade ID. |
| Illiquid Credit + Repack | `Illiquid Credit+Repack` | 1 | Clean Pass; Repack/Illiquid taxonomy; HASE Treats; numeric Trade ID. |
| Equity TRS | `Equity TRS` | 1 | Clean Pass; TRS taxonomy; numeric Trade ID. |

## Remaining Uncertainty / Missing Mapping

The sparse `Structured Credit 2025` fixture only contains:

`Product`, `Category`, `Region`, `Notional (USD)`, `GNBV (USD)`

That is enough to map tiers, volume, VA/GNBV, PC proxy, currency, salesperson/legal defaults, and numeric Trade ID. It is not enough to cleanly populate `*Trade Date` from source. If Structured Credit / Private Credit are expected to be PLUTO-clean without manual override, the source template needs a trade date column, or the business must approve an explicit rule for that field.

I did not invent a trade date fallback because that would damage audit integrity.
