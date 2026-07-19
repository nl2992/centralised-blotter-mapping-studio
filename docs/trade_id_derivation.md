# Trade ID Derivation

App: `centralised_blotter_mapping_studio.html`

The output template field **`*Trade ID`** is always a number. It is produced in two layers: each parser first fixes an internal `row.tradeId` (a native source reference where one exists, otherwise a deterministic synthetic string), and the export layer then converts that to the numeric `*Trade ID` according to the selected Trade ID mode.

## Layer 1 — Output `*Trade ID` (3 modes)

Function: `outputTradeIdNumber(row)`.

| Mode | Formula | When it applies | Example |
|---|---|---|---|
| `business_key` | **Deterministic business-key numeric hash** — `numericHash(sourceSheet, assetClass, tradeDate, client, book, primaryCcy, volumeUsd, productName, security, maturityDate)` | Default restored mode. Native refs do not pass through because the ID is driven by business terms. | Structured FI CLN smoke row -> numeric hash. |
| `native_ref_preferred` | **Native numeric passthrough else deterministic native-context numeric hash** | If `row.tradeId` is all digits and safe as a JS integer, it is used directly. Alphanumeric refs hash with native ref + source context. | Equity TRS numeric `Reference number` can pass through. |
| `legacy_row_order` | **Source row number** else deterministic fallback | Restores the OCR-original row-order option for legacy comparisons. | Excel row 2 -> `2`. |

All hash paths use the same deterministic FNV-1a numeric helper with offset `+1,000,000,000`. Identical seed input yields the same output ID.

Alphanumeric native references remain traceable in `ISIN Code` for Structured FI / Linear Zero. Other asset families may also retain native-reference context in `Comment`; the original internal key is preserved so manual overrides and the row editor are unaffected.

## Layer 2 — Internal `row.tradeId` (native-ref-else-synthetic, 7 variants)

Each parser sets `row.tradeId = <native source reference> || deterministicTradeId(prefix, parts)`. `deterministicTradeId` returns `PREFIX-shortHash(parts)` (same FNV-1a base as `numericHash`, base-36). There are 7 prefix/seed variants:

| Prefix | Asset class(es) | Native reference columns (preferred before synthetic) |
|---|---|---|
| `SFI` | Structured FI (Rate/Credit/FX/Unknown) | `ISIN Front`, `ISIN`, `SVCS No.`, `Summit ID`, `Native Ref`, `Reference Number` |
| `ILC` | Illiquid Credit | `ISIN`, `SVCS No.` |
| `RPK` | Repack | `ISIN`, `SVCS No.` |
| `COL` | Collar (strategy grain) | `PIMS Code`, `OTC ISIN` |
| `COLLEG` | Collar (leg grain) | `PIMS Code`, `OTC ISIN` |
| `TRS` | Equity TRS | `Reference number` |
| `SC` | Structured Credit / Private Credit | *(none — always synthetic)* |

`ILC`/`RPK` and `COL`/`COLLEG` share the same formula shape and differ only by prefix (and, for Collar, row grain).

## Summary

- **3** output-ID modes (`*Trade ID`): business-key hash, native-ref preferred, and legacy row order.
- **7** internal synthetic-ID variants (one `deterministicTradeId` function, 7 prefix + seed lists), plus per-asset native-reference column priority.
- Fully deterministic and stable for a selected mode. The restored default is `business_key`; use `native_ref_preferred` when a numeric native source reference must pass through.
