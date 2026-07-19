# Asset-Class Input Spec

Grounded directly in `centralised_blotter_mapping_studio.html` (the 5 parsers
`parseStructuredFi`, `parseIlliquid`, `parseCollar`, `parseTrs`,
`parseStructuredCredit2025`, plus `mapOne()`/`classify()`/`computePc()`/
`getBuiltInTreatsAcronym()`/`getPbRouting()`). Line numbers are approximate as of
this writing (~4431-line file) and will drift as the file is edited; the
source-of-truth is always the code, not this doc.

The 13 starred (mandatory) PLUTO output fields, confirmed from `HARD_FIELDS` /
`SOFT_FIELDS` (~line 893-909, aliased via `PLUTO_VOLUME_FIELD` <-> `PRIMARY_AMOUNT_FIELD`,
~line 863-868):

`*Trade Date`, `*Primary CCY`, `*$ Volume`, `*$ PC`, `*$ VA/GNBV`, `*Trade ID`,
`*Revenue CCY`, `*Tier 1 Product Type`, `*Tier 2 Product Type`,
`*Salesperson (Coverage)`, `*Legal Entity`, `*Treats Acronym`,
`*Tier 3 Product Type`.

Every asset class listed below is one of the 10 entries in the `ASSET_CLASSES` /
`ASSET_FAMILY` constants (~line 927-942): Structured FI - Rate/Credit/FX/Unknown
(family `structuredFi`), Illiquid Credit / Repack (family `illiquidRepack`),
Structured Credit / Private Credit (family `structuredCredit`), Collar (`collar`),
Equity TRS (`trs`).

Required vs optional below is derived from `mapOne()` (~line 2475): a field is
"REQUIRED (hard fail)" if `setRequiredText()`/`setField()` is called for it with
no placeholder fallback and it is in `plutoRequiredFields()` -- when the source is
blank, `out[field]=""` and the row is marked `UNRESOLVED`, contributing to
`failFields` and forcing `quality = "FAIL"`. "REQUIRED (placeholder-eligible)" means
a `PLACEHOLDER` constant can stand in for it under default (Working + Pragmatic)
settings, which keeps `quality` at `WORKING_PASS` but is flagged separately in this
project as **not real coverage**. "Optional" fields use `setOptionalField()` --
missing source just leaves the field `BLANK`, no effect on `quality`.

---

## 1. Structured FI - Rate / Credit / FX / Unknown

**Parser:** `parseStructuredFi(rows, sheetName)`, called for every sheet matching
`STRUCTURED_FI_REQUIRED_SHEETS` (`Structured FI 2024`, `Structured FI 2025`,
`Structured FI 2026`) and `STRUCTURED_FI_OPTIONAL_SHEETS` (`Linear Zero Traded`,
`Linear Zero`, `Structured FI`, `Structured FI / Linear Zero`). A row is skipped
(logged as "phantom/non-trade row") unless `isStructuredFiTradeRow()` finds a
native trade-ID column populated or a heuristic score >= 4 across trade date /
currency / client / structure-or-product / volume-or-size / VA.

Structured FI output should stay as close as possible to the OCR Linear Zero
mapper. Current-layout WSG columns are accepted as aliases, but optional PLUTO
fields use the Linear Zero plumbing unless a user rule/reference overrides them.
The additive PLUTO-output behavior is product-tier taxonomy only:
`Product`/`Structure` text can identify Linear Zero Callable Notes, Range
Accrual with Conversion, or CLN. `Product Type` may still appear in diagnostic
asset buckets, but it should not change the Linear Zero output plumbing.

| Source column aliases (accepted, in priority order) | Required? | Feeds |
|---|---|---|
| `ISIN Front`, `ISIN`, `SVCS No.`, `Summit ID`, `Native Ref`, `Reference Number` | Required for `*Trade ID` (native path); if absent, a deterministic synthetic ID is generated from a composite seed instead -- `*Trade ID` is still REQUIRED but never truly unresolved (numeric hash fallback always available once any other field is present) | `*Trade ID`, `ISIN Code` |
| `First Trade Date`, `Trade Date`, `Date` | REQUIRED (hard fail, no placeholder) | `*Trade Date` |
| `Currency`, `Primary CCY`, `CCY` | REQUIRED (hard fail, no placeholder) | `*Primary CCY` |
| `Volume ('MM) USD`, `Volume (MM) USD`, `Notional USD Mio`, `Notional USD MM`, `Notional USD`, `Primary Amount` (MM heuristic: `abs<100000` => `x1,000,000`) else `Size (Org Curr)` x `FX rate`/`FX Rate`/`FX Rate Used` | REQUIRED (hard fail) | `*$ Volume` |
| `Total NNBV` else `GNBV in $`/`GNBV USD`/`GNBV (USD)` else `NNBV`/`GNBV` (x `Size` x `FX` if only unit NNBV) | REQUIRED (hard fail; `*$ PC` defaults to `0` unless a PC reference/rule/source is supplied) | `*$ VA/GNBV` |
| `Product`/`Structure` product signals; `Product Type` as diagnostic subtype evidence | Optional -- classification only, never blocks a row. Current Structured FI rows branch on product signals for `Linear Zero Callable Notes`, `Range Accrual with Conversion`, and `ifexists(CLN)` substring detection; legacy zero-linear layout stays locked to the original OCR tier defaults. | `*Tier 1/2/3 Product Type` (via `classify()`/`BUILT_IN_PRODUCT_TAXONOMY`) |
| `FINAL CUSTOMER`, `Client`, `Sales Client` | Optional field-wise (`Sales Client`), but drives `*Treats Acronym` built-in client match (`BUILT_IN_TREATS_BY_CLIENT`) and `getPbRouting()` | `Sales Client`, `*Treats Acronym` |
| `Book`, `Booking` | Internal PB/Treats routing key; output `Book` stays blank by default | `*Treats Acronym` (routing fallback), Sales Client Country/Type |
| `SALETEAM` | Internal/source evidence only for Structured FI; output `Sales Team (Coverage)` stays blank by default | Manual/reference rules only unless explicitly wired |
| `Maturity`, `Maturity Date`, `Settlement` | Optional | `Maturity Date` |
| `Trader`, `Issuer`, `Issuer (raw)` | Optional; output `Trader` stays blank by default, `Issuer` may be source-backed | `Issuer` |
| `Structure`/`Security`, `Underlying`/`Ticker`/`BBG Tix 1`, `Product`/`Security` | Optional; output `Security` and `Ticker` stay blank by default | Product-tier taxonomy only |
| `First Reoffer`, `Reoffer` | Optional | `Price`; OCR price-point normalization (`0.985`, `98.5`, `98.50%` -> `98.5`) |
| `New/Tap/Sell` | Optional (2024-sheet only; blank on 2025/2026 per current fixtures) | `Buy/Sell` |
| `Remarks`/`Notes`/`Comment`, `Coupon`, `Coupon (raw)`, `Range 1/2`, `Avg NNBV (bps) p.a.`, `Non Call x year` | Optional source evidence only | Not mapped by default; Structured FI output `Comment` stays blank |

`*Salesperson (Coverage)`, `*Legal Entity`: never source-derived here -- resolved
by coverage/legal reference-CSV lookup (empty by default), else the constant
defaults `mark lok leung` / `HBAP` (`currentSettings().defaultSalesperson` /
`defaultLegalEntity`, ~line 2496-2515). Always REQUIRED but never truly
unresolved -- a policy default always exists.

`*Treats Acronym`: coverage/legal lookup, else `BUILT_IN_TREATS_BY_CLIENT` (Nomura
Private Bank -> `NOSGSGH`, HASE -> `HASEHKP`), else `getPbRouting()` book/sale-team
site match (SG -> `HRCHSGH`, HK -> `HRCHHKH`). REQUIRED, placeholder-eligible
(`PENDING_TREATS_ACRONYM`) if none of the above resolve.

`*Revenue CCY`: constant `"USD"` always (`setRequiredText("*Revenue CCY", "USD", ...)`,
~line 2525) -- REQUIRED but never actually a gap.

---

## 2. Illiquid Credit / Repack

**Parser:** `parseIlliquid(rows)`, fixed sheet `Illiquid Credit+Repack`.
Sub-class from `Product Type` (`/illiquid credit/i` -> Illiquid Credit,
`/repack/i` in `Product Type` or `Deal Name` -> Repack, else `Illiquid / Unknown`).
A row is skipped only if BOTH `Product Type` and `Deal Name` are blank.

| Source column aliases | Required? | Feeds |
|---|---|---|
| `Trade Date` | REQUIRED (hard fail, no placeholder) | `*Trade Date` |
| `Ccy`, `Currency` | REQUIRED (hard fail) | `*Primary CCY` |
| `Volume ('MM) USD`, `Volume (MM) USD` (same MM heuristic) else `Size (Org Curr)` x `FX Rate` | REQUIRED (hard fail) | `*$ Volume` |
| `GNBV (USD)` else `NNBV` | REQUIRED for VA/GNBV (hard fail); no longer used as default PC unless the VA-proxy PC policy is deliberately selected | `*$ VA/GNBV` |
| `ISIN`, `SVCS No.` | Native `*Trade ID` path; synthetic fallback (`ILC-`/`RPK-` hash) always available | `*Trade ID`, `ISIN Code` |
| `Product Type` / `Deal Name` | Optional; drives tier1/2/3 default (`Structured Credit`/`Structured Credit`/`Structured Credit Notes`) or `BUILT_IN_PRODUCT_TAXONOMY` "Repackaged / Illiquid Credit" rule | `*Tier 1/2/3 Product Type` |
| `FINAL CUSTOMER` | Optional field-wise, drives Treats built-in match | `Sales Client`, `*Treats Acronym` |
| `Booking` | Optional, drives legal lookup + PB routing | `Book`, `*Legal Entity` key, `*Treats Acronym` routing |
| `Status` | Optional -- feeds Buy/Sell only when `illiquidStatusToBuySell = "new_fee_to_sell"` (default): New/Add-on/Fee -> Sell; Unwind -> Buy; unrelated statuses stay blank | `Buy/Sell`, `Comment` |
| `Trader`, `Issuer`, `BBG Tix 1`, `Reoffer`, `Maturity`, `Remarks` | Optional | `Trader`, `Issuer`, `Ticker`, `Price` with OCR price-point normalization (`0.975`, `97.5`, `97.50%` -> `97.5`), `Maturity Date`, `Comment` |

Note: **no `SALETEAM` column is ever read for this family** -- `saleTeam` is
hardcoded `""` in the parser (~line 1845). This means the coverage-CSV lookup path
for `*Salesperson (Coverage)`/`Sales Team (Coverage)` can never match by sales team
for Illiquid/Repack rows even if a coverage reference CSV is loaded; the constant
default (`mark lok leung`) always wins in practice. Not a hard gap (the field still
gets real, non-placeholder coverage via the default), but worth knowing if a
coverage CSV keyed by sales team is ever wired in for this family.

`*Salesperson (Coverage)`, `*Legal Entity`, `*Treats Acronym`, `*Revenue CCY`:
same resolution chain as Structured FI (see above); all REQUIRED,
placeholder-eligible only for Treats.

---

## 3. Structured Credit / Private Credit

**Parser:** `parseStructuredCredit2025(rows)`, fixed sheet `Structured Credit
2025`. Sub-class: `/private\s+credit|private\s+placement/i` against
`Product`+`Category` -> Private Credit, else Structured Credit. A row is skipped
only if `Product`, `Notional (USD)/Notional`, and `GNBV (USD)/GNBV` are ALL blank.

| Source column aliases actually read | Required? | Feeds |
|---|---|---|
| `Product` | Optional | `Security`, `productName`, tier classification input, synthetic ID seed |
| `Category` | Optional | `structureName`, `Comment`, sub-class decision |
| `Region` | Optional | `Comment` only |
| `Notional (USD)`, `Notional` | REQUIRED (hard fail if both blank) | `*$ Volume` |
| `GNBV (USD)`, `GNBV` | REQUIRED (hard fail if both blank; `*$ PC` defaults to `0` unless a PC reference/rule/source is supplied) | `*$ VA/GNBV` |

**This is the entire column set the parser reads** -- confirmed against the actual
`Structured Credit 2025` sheet in `ocr_work/test_non_linear_taxonomy.xlsx`, whose
header row is literally `Product, Category, Region, Notional (USD), GNBV (USD)`
and nothing else. There is no `Trade Date`, `FINAL CUSTOMER`, `Book`, `SALETEAM`,
native trade-ID, `ISIN`, `Maturity`, `Issuer`, `Ticker`, `Price`, or `Currency`
column on this sheet at all, and even if one were added, **`parseStructuredCredit2025`
does not read it** -- `tradeDate`, `client`, `saleTeam`, `book`, `issuer`,
`issuerRaw`, `isinCode`, `ticker`, `price` are hardcoded `null`/`""` in the pushed
row object (~line 2078-2113), and `primaryCcy` is hardcoded to the literal string
`"USD"` (not read from any column).

Consequences for the 13 starred fields, with COMPLETE input (verified empirically
via `docs/starred_field_gap_report.md`):

- `*Trade Date`: **always `UNRESOLVED`.** `mapOne()`'s `*Trade Date` call has no
  placeholder key (~line 2507), so a blank `row.tradeDate` is a hard, unconditional
  fail. No amount of extra source columns fixes this without a code change.
- `*Primary CCY`: always populates as `"USD"`, but via a parser-level hardcoded
  constant, not a real source column -- `mapOne()` still labels it `SOURCE_BACKED`
  in the audit, which is a minor traceability mislabel (see gap report).
- `*$ Volume`, `*$ VA/GNBV`: real, source-backed, given `Notional (USD)`/`GNBV (USD)`.
- `*$ PC`: defaults to `0` under the default `pcPolicyIlliquid` policy unless
  a PC reference/rule/source candidate is supplied. The VA-proxy policy remains selectable.
- `*Trade ID`: always resolves via `outputTradeIdNumber()`'s deterministic hash
  fallback (seed includes `sourceSheet`+`sourceRowNumber`+`assetClass`, always
  non-empty) -- real coverage.
- `*Revenue CCY`, `*Tier 1/2/3 Product Type`: constant/`TIER_DEFAULTS`/built-in
  taxonomy resolve without any source column -- real coverage.
- `*Salesperson (Coverage)`, `*Legal Entity`: constant defaults (`mark lok leung`
  / `HBAP`) -- real coverage, since the defaults don't require `saleTeam`/`book`
  to be non-empty.
- `*Treats Acronym`: **can only ever be the working-mode PLACEHOLDER
  (`PENDING_TREATS_ACRONYM`) or `UNRESOLVED`.** Both `getBuiltInTreatsAcronym()`
  and `getPbRouting()` build their match haystack from `row.client`, `row.book`,
  `row.issuer`, `row.issuerRaw`, plus `row.raw` lookups on `FINAL CUSTOMER`/`Sales
  Client`/`Customer`/`Client`/`Issuer`/`Book` (~line 2280-2296) -- all of which are
  hardcoded empty/absent for this parser, and none of which exist as columns on
  the sheet anyway. There is no code path that can ever populate this field with
  a traceable value for Structured Credit or Private Credit.

**Bottom line: Structured Credit and Private Credit cannot reach a non-`FAIL`
quality, and cannot reach real (non-placeholder) `*Treats Acronym` coverage,
regardless of how complete the input is** -- both are structural parser
limitations (missing columns + missing read logic), not data-quality issues.
Fixing them requires either adding `Trade Date`/`FINAL CUSTOMER`/`Book`/`SALETEAM`
columns to the `Structured Credit 2025` sheet AND wiring `parseStructuredCredit2025`
to read them, or adding explicit mapping-rule/default overrides for this asset
family.

---

## 4. Collar

**Parser:** `parseCollar(rows, grain)`, fixed sheet `Collar Blotter`. Grain is
`currentSettings().collarRowGrain` (default `"strategy"`): groups legs by
`PIMS Code`/`OTC ISIN` (else a synthetic key from `First Trade Date`+
`FINAL CUSTOMER`+`Underlying`) and emits ONE row per group at strategy grain, or
one row per source row at leg grain.

| Source column aliases | Required? | Feeds |
|---|---|---|
| `First Trade Date` | REQUIRED (hard fail) | `*Trade Date` |
| `Currency` | REQUIRED (hard fail) | `*Primary CCY` |
| `Notional Amount (USD)` | REQUIRED (hard fail). Strategy grain: `MAX` across legs in the group | `*$ Volume` |
| `Total GNBV (USD)` | REQUIRED (hard fail). Strategy grain: `SUM` across legs | `*$ VA/GNBV` |
| `PB Fee (USD)` | Drives `*$ PC` primary path (`pbfee_then_zero`, default policy) -- strategy grain sums across legs; fallback is `0` | `*$ PC` |
| `PIMS Code`, `OTC ISIN` | Native `*Trade ID`/grouping key; synthetic (`COL-`/`COLLEG-` hash) fallback available | `*Trade ID`, `ISIN Code` (`OTC ISIN` only) |
| `FINAL CUSTOMER` | Optional field-wise, Treats built-in match | `Sales Client`, `*Treats Acronym` |
| `Book` | Optional, legal lookup + PB routing | `Book`, `*Legal Entity` key, `*Treats Acronym` routing |
| `SALETEAM` | Optional, coverage lookup key | `Sales Team (Coverage)`, `*Salesperson` key |
| `Product` (`/call/i`/`/put/i`) | Optional; leg call/put tagging only, no tier effect (tier3 = `Collar / Options` default) | `Comment`, `productName` |
| `Structure`, `Underlying`, `Client Price`, `Maturity` | Optional | `Security`, `Ticker`, `Price`, `Maturity Date` |
| `New/Unwind` | Optional, mapped New/Add-on/Fee -> Sell and Unwind -> Buy | `Buy/Sell` |
| `Strike (%)`, `Strike (Level)`, `Initial Fixing`, `No. of options`, `Option Premium Amount (Original ccy)`, `Total GNBV (bps)` | Optional, economics tokens | `Comment` |

Same `*Salesperson`/`*Legal Entity`/`*Treats Acronym`/`*Revenue CCY` resolution
chain as Structured FI; all REQUIRED but resolve to real values in practice given
the `FINAL CUSTOMER`/`Book` columns Collar always has.

---

## 5. Equity TRS

**Parser:** `parseTrs(rows)`, fixed sheet `Equity TRS`. A row is skipped only if
both `Reference number` and `Product` are blank.

| Source column aliases | Required? | Feeds |
|---|---|---|
| `Trade Date` | REQUIRED (hard fail) | `*Trade Date` |
| `Currency` | REQUIRED (hard fail) | `*Primary CCY` |
| `Notional in USD` (direct, no MM heuristic) | REQUIRED (hard fail) | `*$ Volume` |
| `MSS Revenue in USD` (default `trsVaPolicy="mss"`) or `Total Bank Revenue in USD` (`"bank"`) | REQUIRED (hard fail) | `*$ VA/GNBV` |
| `Commission to PB (HKD)`/`Commision to PB (HKD)` x `FX rate`/`FX Rate Used` (multiply by default, `trsFxConvention`) | Primary `*$ PC` path | `*$ PC` |
| `Total Bank Revenue in USD` minus `MSS Revenue in USD` | Optional `*$ PC` path if the Bank-MSS policy is selected | `*$ PC` |
| `Reference number` | Native `*Trade ID` (numeric passthrough if already digits); synthetic (`TRS-` hash) fallback otherwise | `*Trade ID` |
| `FINAL CUSTOMER` | Optional field-wise, Treats built-in match | `Sales Client`, `*Treats Acronym` |
| `Book` | Optional, legal lookup + PB routing | `Book`, `*Legal Entity` key, `*Treats Acronym` routing |
| `SALETEAM` | Optional, coverage lookup key | `Sales Team (Coverage)`, `*Salesperson` key |
| `Underlying`, `Structure`, `Net Price`/`Gross Price`/`Gross Price Local`, `Maturity`, `Settlement Date`, `No. of shares` | Optional | `Ticker`, `Security`, `Price`, `Maturity Date`, `Comment` |
| `New/Unwind`/`Status` | Optional, mapped New/Add-on/Fee -> Sell and Unwind -> Buy | `Buy/Sell` |

Same `*Salesperson`/`*Legal Entity`/`*Treats Acronym`/`*Revenue CCY` chain as
Structured FI; all REQUIRED and resolve to real values given TRS's `FINAL
CUSTOMER`/`Book`/`SALETEAM` columns.

---

## Doc-vs-code drift found

1. **`docs/non_linear_template_inventory.md` has NO section at all for the
   `Structured Credit 2025` sheet, `parseStructuredCredit2025`, or the Structured
   Credit / Private Credit asset classes** -- it documents Structured FI, Collar
   Blotter, Illiquid Credit + Repack, and Equity TRS only (see its `##` headings:
   `Structured FI`, `Collar Blotter`, `Illiquid Credit + Repack`, `Equity TRS`).
   Given this is one of the app's five parsers and produces two of the ten output
   asset classes, this is a material omission. Not corrected here per the task's
   "flag, don't silently fix" instruction -- flagging it now; a follow-up should
   add a `## Structured Credit 2025` section mirroring the other four.
2. **`ocr_work/current_mapping_coverage.md` is accurate and already correctly
   documents** the Structured Credit Trade Date gap ("Structured Credit 2025 has
   no source trade date in current parser", line 23) and the missing
   client/book/sales-team/ISIN/maturity/issuer/ticker/buy-sell/price columns
   (line 88, "Missing Mapping To Close" table). No correction needed there; this
   spec's Structured Credit section above is consistent with it and adds the
   `*Treats Acronym` placeholder-only consequence and the `*Primary CCY`
   hardcoded-constant traceability nuance, which that doc does not call out.
3. No other drift found between the two existing docs and the code for the
   Structured FI / Illiquid+Repack / Collar / Equity TRS sections -- their
   documented column lists and defaults match the parser code read in this
   research pass.

See `docs/starred_field_gap_report.md` for the evidence-based, test-run-verified
version of the coverage claims made above.
