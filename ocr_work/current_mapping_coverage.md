# Current Mapping Coverage

Generated: 2026-07-18  
Runnable app: `/Users/nigelli/Desktop/Centralised Mapping/centralised_blotter_mapping_studio.html`  
OCR stitch status: supplemental screenshots for PDF pages 199 and 232 have been stitched into the app behavior. Page 15 remains the only unsupplied missing PDF page.

Related source-template inventory: `docs/non_linear_template_inventory.md`.  
Related delivery plan: `docs/non_linear_mapper_deliverables.md`.  
Related test cases: `docs/non_linear_test_cases.md`.

## Current Template Mapping

The current fallback template has 44 output fields. `*$ Volume` is the PLUTO output amount column. `*Trade Date` and `Maturity Date` are emitted as `dd/mm/yyyy`.

PLUTO means the output template. Every output field beginning with `*` has to be populated for PLUTO readiness, including `*$ Volume`.

| Target field | Current mapping / provenance | Remaining dependency or gap |
|---|---|---|
| `*Salesperson (Coverage)` | Coverage reference lookup by Sales Team, else configurable default (`Field defaults` setting `defaultSalesperson`, default `mark lok leung`). Always populated. | Provide coverage CSV or per-asset rule to override the default where a real salesperson differs. |
| `*Tier 1 Product Type` | Product reference override, else built-in taxonomy for Private Credit/CLN/Repack/Illiquid, else asset default. | Product reference if firm taxonomy differs. |
| `*Tier 2 Product Type` | Product reference override, else built-in taxonomy for Private Credit/CLN/Repack/Illiquid, else asset default. | Product reference if firm taxonomy differs. |
| `*Tier 3 Product Type` | Product reference override, else built-in taxonomy for Private Credit/CLN/Repack/Illiquid and the explicit Structured FI products, else asset-class default. Structured FI unknowns keep the Linear Zero default rather than inventing a source-text tier. | Product reference/rules needed for other unknown or firm-specific tier 3 taxonomy. |
| `*Trade Date` | Source trade date, formatted `dd/mm/yyyy`. | Structured Credit 2025 has no source trade date in current parser. |
| `*Primary CCY` | Source currency. Structured Credit 2025 defaults to `USD`. | Confirm if Structured Credit can be non-USD. |
| `*Legal Entity` | Legal reference lookup by Book/Issuer, else configurable default (`Field defaults` setting `defaultLegalEntity`, default `HBAP`, learned from the original Linear Zero `SHARED_CONSTANTS.legalEntity`). Always populated. | Provide legal CSV or per-asset rule to override where the entity differs. |
| `Site Code` | Structured FI/Linear Zero defaults to OCR constant `HKH`; other assets use legal reference lookup. | Needs legal CSV for non-Structured-FI assets or firm overrides. |
| `*Treats Acronym` | Coverage/legal reference lookup, else built-in client fallback for Nomura Private Bank (`NOSGSGH`) and HASE/Hang Seng (`HASEHKP`), else Linear Zero booking-site routing by Book/Sales Team (SG -> `HRCHSGH`, HK -> `HRCHHKH`). Working mode can use `PENDING_TREATS_ACRONYM` only if still unresolved (e.g. no client match and no resolvable SG/HK book). | Needs coverage/legal CSV or new built-in mapping for clients/sites outside SG/HK/Nomura/HASE. |
| `*$ Volume` | Asset-specific USD notional/volume derivation. | Source columns required; otherwise unresolved. |
| `*$ PC` | Asset-specific PC waterfall: PC reference/source first where available; default fallback is `0`. Collar uses PB Fee first; TRS uses commission first. VA proxy and Bank-MSS remain optional policies. | Confirm TRS FX convention and any firm PC reference override. |
| `*$ VA/GNBV` | Asset-specific VA/GNBV source derivation. | Source columns required; otherwise unresolved. |
| `Sales Team (Coverage)` | Coverage reference `sales_team_coverage`, else source for non-Structured-FI assets. Structured FI/Linear Zero leaves this optional output blank by default, matching OCR. | Illiquid/Repack and Structured Credit currently have no source Sales Team. |
| `Sales Person Country` | Coverage reference, else optional source value if present. | Needs coverage CSV for reliable fill. |
| `*Trade ID` | Numeric output ID. Numeric native IDs remain numeric; alphanumeric native references are converted to deterministic numeric IDs and retained in `ISIN Code`/`Comment`. | Validate downstream numeric range expectations. Structured Credit remains deterministic unless a native numeric source is added. |
| `*Revenue CCY` | Constant `USD`. | Add rule if firm template requires source currency. |
| `Secondary CCY` | Source-backed if a canonical secondary currency exists; current parsers leave it blank. | Needs source/rule if required by downstream users. |
| `ISIN Code` | Source ISIN for Structured FI, Illiquid/Repack, and Collar. | Blank for Structured Credit and Equity TRS unless rules are added. |
| `Maturity Date` | Source maturity date, formatted `dd/mm/yyyy`. | Structured Credit 2025 currently blank. |
| `Sales Client` | Source final customer/client, else PB book routing entity (SG -> `HSBC PRIV BK (S) SA SGH`, HK -> `HSBC PRIV BK (S) SA HK`) when source is blank. | Structured Credit 2025 blank when no source client and no resolvable SG/HK book. |
| `Sales Client Sector` | Coverage reference lookup. | Needs coverage CSV. |
| `Sales Client Country` | Coverage reference lookup, else PB book routing (SG -> `SG`, HK -> `HK`). | Needs coverage CSV for clients/sites outside SG/HK. |
| `Sales Client Type` | Coverage reference lookup, else PB book routing (SG -> `BOF`, HK -> `FBL`). | Needs coverage CSV for clients/sites outside SG/HK. |
| `Book` | Source Book/Booking. | Structured Credit 2025 currently blank. |
| `Trader` | Source Trader for Structured FI and Illiquid/Repack. | Blank for Collar, Equity TRS, Structured Credit unless rules/source columns are added. |
| `Platform` | Legal reference lookup. | Needs legal CSV. |
| `FX Platform Description` | Legal reference lookup. | Needs legal CSV. |
| `PC CODE` | PC reference lookup, else legal reference lookup. | Needs PC/legal CSV. |
| `CCY PC` | PC reference, else legal reference, else Primary CCY. | Needs confirmation if PC currency differs from primary currency. |
| `$ TV` | Policy-derived copy of `*$ Volume` when `copyVolumeToTV` is enabled; otherwise blank. | Confirm preferred firm policy. |
| `Commission Code` | PC reference lookup. | Needs PC CSV. |
| `Security` | Product reference override, else source security/product/structure. | Structured Credit maps Product. |
| `Issuer` | Source Issuer for Structured FI and Illiquid/Repack. | Blank for Collar, Equity TRS, Structured Credit unless rules/source columns are added. |
| `Ticker` | Product reference override, else source Underlying/BBG ticker. | Blank for Structured Credit unless rules/source columns are added. |
| `Buy/Sell` | Action-side convention: `New`, `Addon`/`Add-on`, and `Fee` map to `Sell`; `Unwind` maps to `Buy`; literal Buy/Sell values pass through. Illiquid/Repack only derives this for recognized `Status` values under the default status policy. | Confirm any asset-specific exception to the side convention. |
| `Price` | Source Reoffer/Client Price/Net Price/Gross Price. | Blank for Structured Credit unless rules/source columns are added. |
| `BTB Trade Site` | Structured FI/Linear Zero defaults to OCR constant `LOH`; other assets use legal reference lookup. | Needs legal CSV for non-Structured-FI assets or firm overrides. |
| `Flow Value` | Legal reference lookup. | Needs legal CSV. |
| `Liquidity Reserve` | Legal reference lookup. | Needs legal CSV. |
| `CVA` | Legal reference lookup, else source `cvaUsd` if populated by a parser/rule. | Needs legal CSV or source/rule. |
| `FVA` | Legal reference lookup. | Needs legal CSV. |
| `Risk Book` | Structured FI/Linear Zero defaults to OCR constant `IRSMTN`; other assets use legal reference lookup. | Needs legal CSV for non-Structured-FI assets or firm overrides. |
| `TFX Flag` | Legal reference lookup. | Needs legal CSV. |
| `Comment` | Policy-derived audit trail: source sheet, row, asset, volume source, VA source, PC source, plus source comments/status. | None; useful for remediation. |

## Asset-Class Source Mapping

| Asset class / family | Current source-backed mapping | Main missing mapping |
|---|---|---|
| Structured FI - Rate | Linear Zero output plumbing with current-layout source aliases accepted: trade date, currency, volume, VA/GNBV, ISIN/native ID, maturity, sales client, issuer, reoffer/price, optional action. Optional output Comment, Book, Security, Trader, Ticker, and Sales Team stay blank by default; Site Code/BTB/Risk Book use OCR constants. | Product reference/rules required for firm-specific tier exceptions; coverage/legal/PC reference-driven fields outside the OCR constants. |
| Structured FI - Credit | Same Linear Zero output plumbing as Rate. Current-layout `Product` text can route CLN to Structured Credit / Structured Credit / Credit Linked Notes; CLN takes priority over Range Accrual wording when both appear. | Product reference/rules required for firm-specific tier exceptions; coverage/legal/PC reference-driven fields outside the OCR constants. |
| Structured FI - FX | Same Linear Zero output plumbing as Rate. Current-layout `Product = Range Accrual with Conversion` maps to Structured Rates / Interest Rate Linked Note -PPN / Range Accrual with Conversion; `Product = Linear Zero Callable Notes` keeps the original zero-linear rates taxonomy. | Product reference/rules required for firm-specific tier exceptions; coverage/legal/PC reference-driven fields outside the OCR constants. |
| Structured FI - Unknown | Same Linear Zero output plumbing as Rate. Product-specific taxonomy covers Linear Zero Callable Notes, Range Accrual with Conversion, and CLN; anything else keeps the OCR Linear Zero tier default unless a rule/reference overrides it. | Product reference/rules required for other unknown taxonomy; coverage/legal/PC reference-driven fields outside the OCR constants. |
| Illiquid Credit | `Trade Date`, `Ccy`/`Currency`, `Volume ('MM) USD` or `Size (Org Curr)` x `FX Rate`, `GNBV (USD)`/`NNBV`, `ISIN`/`SVCS No.`, `Maturity`, `FINAL CUSTOMER`, `Booking`, `Trader`, `Issuer`, `BBG Tix 1`, `Deal Name`, `Reoffer`; tiers default to Structured Credit / Structured Credit / Structured Credit Notes; no-source PC defaults to `0`. | Sales Team/Coverage if not in reference; legal/PC reference fields; Buy/Sell is blank unless `Status` contains New/Add-on/Fee or Unwind. |
| Repack | Same Illiquid/Repack mapping, classified by Product Type or Deal Name containing Repack; tiers default to Structured Credit / Structured Credit / Structured Credit Notes; no-source PC defaults to `0`. | Sales Team/Coverage if not in reference; legal/PC reference fields; Buy/Sell is blank unless `Status` contains New/Add-on/Fee or Unwind. |
| Structured Credit | `Product`, `Category`, `Region`, `Notional (USD)`/`Notional`, `GNBV (USD)`/`GNBV`; currency policy defaults to `USD`; trade ID is deterministic numeric. CLN text maps to Structured Credit / Structured Credit / Credit Linked Notes. | Trade Date, native Trade ID, Sales Client, Sales Team, Book, Trader, Legal Entity, Site Code, ISIN, Maturity, Issuer, Ticker, Buy/Sell, Price, and most reference-driven fields. |
| Private Credit | Parsed from Structured Credit 2025 rows whose Product/Category indicates Private Credit or Private Placement; tiers default to Private Credit Primary / Private Placement / Private Placement. | Same missing source fields as Structured Credit unless the workbook includes extra columns or rules. |
| Collar | `First Trade Date`, `Currency`, `Notional Amount (USD)`, `Total GNBV (USD)`, `PIMS Code`/`OTC ISIN`, `OTC ISIN`, `Underlying`, `Client Price`, `Structure`, `Maturity`, `Book`, `SALETEAM`, `FINAL CUSTOMER`, `New/Unwind` to Buy/Sell, `PB Fee (USD)` for PC waterfall. | Legal/reference fields; Trader; Issuer; Secondary CCY. Strategy grain collapses legs and keeps leg context in Comment. |
| Equity TRS | `Trade Date`, `Currency`, `Notional in USD`, `MSS Revenue in USD` or `Total Bank Revenue in USD`, `Reference number`, `Underlying`, `Net Price`/`Gross Price`, `Structure`, `Maturity`, `Book`, `SALETEAM`, `FINAL CUSTOMER`, `New/Unwind`/`Status`; PC from `Commission to PB (HKD)` x FX rate, else lookup/0 by default. | Confirm PC FX-rate direction; legal/reference fields; ISIN; Issuer; Trader; Secondary CCY. |

## Missing Mapping To Close

| Area | Affects | Required input |
|---|---|---|
| Remaining OCR source page | Full source reconstruction | PDF page 15 screenshot/photo if available. Pages 199 and 232 are now supplied. |
| Coverage reference | All asset classes, especially hard field `*Salesperson (Coverage)` | CSV with Sales Team to salesperson coverage, sales team coverage, Treats acronym, salesperson country, client sector/country/type. |
| Legal reference | All asset classes | CSV keyed by Book and/or Issuer with Legal Entity, Site Code, Platform, FX Platform Description, PC Code, PC currency, BTB Trade Site, Flow Value, Liquidity Reserve, CVA/FVA, Risk Book, TFX Flag. |
| Product taxonomy reference | Structured FI - Unknown and any firm-specific taxonomy differences | Product reference CSV or Mapping Studio rules for tier 1/2/3, Security, Ticker, Buy/Sell overrides. |
| PC reference/policy | All asset classes; especially TRS and products without direct PC source | PC CSV by Trade ID/Asset Class or confirmed fallback policy. Confirm whether TRS `FX rate` should multiply HKD commission or divide it. |
| Structured Credit 2025 detail | Structured Credit | Source columns or rules for Trade Date, Sales Client, Book, Sales Team, native ID, ISIN, Maturity, Issuer, Ticker, Buy/Sell, and Price. |
| Illiquid/Repack action side | Illiquid Credit and Repack | Decision on whether `Status` should map to Buy/Sell, and the exact value map. |
