# Trade ID Derivation

App: `centralised_blotter_mapping_studio.html`

The output template field **`*Trade ID`** is always a number. It is produced in two layers: each parser first fixes an internal `row.tradeId` (a native source reference where one exists, otherwise a deterministic synthetic string), and the export layer then converts that to the numeric `*Trade ID`.

## Layer 1 — Output `*Trade ID` (2 formulas)

Function: `outputTradeIdNumber(row)`.

| # | Formula | When it applies | Example |
|---|---|---|---|
| 1 | **Native numeric passthrough** — the source reference is used verbatim as a number | `row.tradeId` is all digits and a safe JS integer | Equity TRS `Reference number = 123456` → `123456` |
| 2 | **Deterministic numeric hash** — `numericHash(seed)` (FNV-1a, offset `+1,000,000,000`) | Every alphanumeric native reference (ISIN, OTC ISIN, PIMS, SVCS, Summit…) and every synthetic ID | `XS3307267255` → `4204720592` |

Formula 2 seed (order-sensitive, `|`-joined, blanks dropped):

```
raw · sourceSheet · sourceRow · assetClass · tradeDate · client · book · primaryCcy · volumeUsd
```

The hash is deterministic: identical seed input always yields the same output ID. Alphanumeric native references remain traceable in `ISIN Code` and/or `Comment` (`native_trade_ref=…`), and the original internal key is preserved so manual overrides and the row editor are unaffected.

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

- **2** output-ID formulas (`*Trade ID`): native numeric passthrough, and deterministic numeric hash.
- **7** internal synthetic-ID variants (one `deterministicTradeId` function, 7 prefix + seed lists), plus per-asset native-reference column priority.
- Fully deterministic and stable: the smoke fixture's exported IDs (`4204720592`, `3329199354`, `2381983830`, `2810938652`, `2635637780`, `5141050790`, `123456`) are reproduced bit-for-bit on every run — see `docs/non_linear_test_cases.md`.
