# Template Detection

App: `centralised_blotter_mapping_studio.html`

The OCR-restored workflow processes **one selected worksheet at a time**. Detection is now scoped to that selected sheet: the user chooses Asset + Worksheet, the app reads that worksheet, scores its headers, and records one `state.sheetStatuses` row for the current process run.

The older whole-workbook detection helpers still exist as hidden engineering support, but the visible product no longer auto-parses every sheet in an uploaded workbook.

## Selected-Sheet Routing

`Load Workbook` reads workbook metadata and populates the Worksheet dropdown. It does not map any rows.

`Process selected sheet` routes the currently selected worksheet through the parser implied by the Asset dropdown:

| Asset dropdown | Parser |
|---|---|
| Structured FI / Linear Zero | `parseStructuredFi`, except `Structured Credit 2025` signature routes to `parseStructuredCredit2025`. |
| Collar | `parseCollar`. |
| Illiquid Credit + Repack | `parseIlliquid`. |
| Equity TRS | `parseTrs`. |

The selected sheet gets `status: "ok"` when it is read and processed. The status message records raw rows, mapped rows, parser warnings, and detected template label.

## Header Signatures

`TEMPLATE_SIGNATURES` scores a sheet's normalised header set against each entry's `signature` list (+1 per matching column) and subtracts hard if any `exclude` column is present (`score -= 100`, effectively vetoing that template).

| id | Label | Distinctive signature columns | `exclude` |
|---|---|---|---|
| `structured_fi_current` | Structured FI (current) | `ISIN Front`, `SALETEAM`, `First Trade Date`, `Trade Date`, `FINAL CUSTOMER`, `Volume ('MM) USD`, `Total NNBV`, `First Reoffer`, `Product Type` | *(none)* |
| `linear_zero` | Linear Zero | `Notional USD Mio`, `Notional USD MM`, `Date`, `Client`, `Security`, `NNBV`, `Reoffer`, `Ticker`, `Maturity Date` | `ISIN Front`, `SALETEAM`, `Volume ('MM) USD` |
| `collar` | Collar | `OTC ISIN`, `Notional Amount (USD)`, `Total GNBV (USD)`, `PB Fee (USD)`, `New/Unwind`, `Client Price`, `PIMS Code` | *(none)* |
| `illiquid_repack` | Illiquid / Repack | `Product Type`, `Deal Name`, `GNBV (USD)`, `Booking`, `Reoffer`, `SVCS No.` | *(none)* |
| `structured_credit_2025` | Structured Credit 2025 | `Product`, `Category`, `Region`, `Notional (USD)`, `GNBV (USD)` | *(none)* |
| `equity_trs` | Equity TRS | `Reference number`, `Notional in USD`, `MSS Revenue in USD`, `Commission to PB (HKD)`, `Commision to PB (HKD)`, `SALETEAM`, `Structure` | *(none)* |

Every signature column is drawn directly from the alias lists each parser already accepts via `rowValue()`, so a sheet a parser can genuinely read scores highly by construction.

### The Linear-Zero-vs-Structured-FI discriminator

`linear_zero` and `structured_fi_current` share a parser (`parseStructuredFi`) but must still be told apart, because current-format Structured FI sheets carry extra columns that a legacy Linear Zero sheet never has. `linear_zero`'s `exclude` list — `ISIN Front`, `SALETEAM`, `Volume ('MM) USD` — hard-concedes to `structured_fi_current` the moment any one of those columns is present: the score gets `-100`, so `linear_zero` cannot win even if it also matches several of its own signature columns. In practice this means "if it looks like it could be either, it's the current-format sheet."

### Confidence threshold

`TEMPLATE_DETECTION_MIN_SCORE = 3`. A sheet is only auto-routed (`detection.confident = true`) if the best-scoring template reaches at least 3 matching signature columns; this is kept above a naive "2 columns is enough" floor so a couple of generically-named columns (e.g. a stray `Date` or `Client`) on an unrelated sheet can't produce a false positive. Below the threshold, `detectTemplate` returns `{ template: null, confident: false, score: <best score, floor 0> }`.

## Important Change From The Broken Rewrite

The app no longer runs `autoDetectRemainingSheets()` across every sheet during normal user operation. That was part of the broken centralised rewrite and is deliberately out of the visible workflow now.

For non-standard worksheet names, the user should choose the correct Asset and Worksheet, then process that one sheet. The header signature still labels the selected sheet and helps route `Structured Credit 2025` when it is selected under Structured FI / Linear Zero.
