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
| Tab layout | Replaced the original tab set with Template Mapping, Reconciliation, Diagnostics, Canonical Rows, Field Matrix, References, Governance, Settings, Debug Log. | Restored Overview, Mapping Studio, Processed Sheet, Exceptions, Golden Record, Default Rules, Saved Settings, Activity Log. |
| Processed sheet | Output review moved into other mapping/debug views. | Restored a Processed Sheet grid with inline PLUTO output editing and row selection for export. |
| Export selection | Export gate acted over all mapped rows. | Export first respects selected rows from Processed Sheet, then applies the final gate. |
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
| Linear Zero default | `Structured Rates / Interest Rate Linked Note -PPN / Interest Rate Linked Note -PPN`, preserved from the OCR-original board. |
| CLN | `Structured Credit / Structured Credit / Credit Linked Notes`. |
| Repackaged + Illiquid Credit | `Structured Credit / Structured Credit / Structured Credit Notes`. |
| Private Credit | `Private Credit Primary / Private Placement / Private Placement`. |
| Collar | `Equity Derivatives / Equity Derivatives / Collar / Options`. |
| Equity TRS | `Equity Derivatives / Equity Derivatives / Total Return Swap`. |
| Nomura Private Bank Treats | `NOSGSGH`, unless a coverage/legal reference overrides it. |
| HASE / Hang Seng Treats | `HASEHKP`, unless a coverage/legal reference overrides it. |
| PB routing | SG -> `HRCHSGH`; HK -> `HRCHHKH`, preserved from the original Linear Zero logic. |
| Numeric `*Trade ID` | All modes export a numeric value. Native alphanumeric refs remain traceable in `ISIN Code` and/or `Comment`. |
| PLUTO starred fields | Every output header beginning with `*` is required for clean PLUTO readiness. |

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
| Structured FI / Linear Zero | `Linear Zero` | 1 | Clean Pass; existing zero-linear aliases and OCR tier defaults preserved. |
| Structured FI / Linear Zero | `Structured Credit 2025` | 2 | Taxonomy works for CLN and Private Credit; sparse source still lacks `*Trade Date`. |
| Collar | `Collar Blotter` | 1 | Clean Pass; strategy grain; PB Fee PC; numeric Trade ID. |
| Illiquid Credit + Repack | `Illiquid Credit+Repack` | 1 | Clean Pass; Repack/Illiquid taxonomy; HASE Treats; numeric Trade ID. |
| Equity TRS | `Equity TRS` | 1 | Clean Pass; TRS taxonomy; numeric Trade ID. |

## Remaining Uncertainty / Missing Mapping

The sparse `Structured Credit 2025` fixture only contains:

`Product`, `Category`, `Region`, `Notional (USD)`, `GNBV (USD)`

That is enough to map tiers, volume, VA/GNBV, PC proxy, currency, salesperson/legal defaults, and numeric Trade ID. It is not enough to cleanly populate `*Trade Date` from source. If Structured Credit / Private Credit are expected to be PLUTO-clean without manual override, the source template needs a trade date column, or the business must approve an explicit rule for that field.

I did not invent a trade date fallback because that would damage audit integrity.
