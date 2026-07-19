# Template Detection

App: `centralised_blotter_mapping_studio.html`

Every uploaded sheet must end up either parsed into canonical rows or explicitly explained in Diagnostics — never silently dropped. Detection runs in two passes: **name-based routing first**, then a **header-signature fallback** for anything left over. Each sheet gets one row in `state.sheetStatuses` (surfaced via `pushSheetStatus`, viewable in the Diagnostics tab and, for problem sheets, on the Overview control board).

## Pass 1 — Name-based routing

`parseWorkbook` matches sheet names against `EXPECTED_SHEETS` (`STRUCTURED_FI_REQUIRED_SHEETS` + `"Collar Blotter"`, `"Illiquid Credit+Repack"`, `"Structured Credit 2025"`, `"Equity TRS"`) via `findSheetName` (exact match, then substring match, both normalised). A matched sheet is parsed by its dedicated parser and gets `status: "ok"`; a name that doesn't resolve to an actual sheet gets `status: "not_found"`.

Sheets whose name matches `CONTROL_SHEETS` (`"Consolidate Sheet"`, `"Structured Rate + Credit"`, `"Collar Summary"`, `"Equity TRS Summary"`) are treated as control/summary sheets by default — no row-level data expected.

## Pass 2 — Header-signature fallback (`autoDetectRemainingSheets` → `detectTemplate`)

After name-based routing claims whatever it recognises, `autoDetectRemainingSheets` walks every sheet **not already consumed** (tracked via the `actual` sheet names already present in `state.sheetStatuses`) and runs `detectTemplate(headers)` against it. This lets a sheet under a non-standard name (e.g. "LZ Book" instead of "Linear Zero") still get routed to the right parser, instead of being silently dropped.

### The 6 template signatures

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

### Routing order and outcomes

For each sheet not already consumed by Pass 1:

1. If `detectTemplate` is confident, the matching parser runs and the sheet gets `status: "auto_detected"` with `template` set to the matched label and `rows` set to the parsed row count — **even if the sheet's name also matches a control sheet** (see below).
2. Otherwise (no confident signature match):
   - If the sheet's name matches `CONTROL_SHEETS`, it stays a skipped summary: `status: "control_present"`, `rows: 0`.
   - If it has no data rows at all, `status: "unrecognized"`, message `"No data rows found"`.
   - If it has data rows but no confident match, `status: "unrecognized"`, message `"No confident template match (best score N)"`.
3. A read/parse exception on the sheet produces `status: "error"` with the exception message, rather than crashing the parse.

Sheets already parsed by Pass 1, on either an exact- or already-claimed name, are skipped entirely in Pass 2 (tracked via the `actual` field already recorded in `state.sheetStatuses`).

### "Both scenarios" for control-named sheets

A sheet whose name matches `CONTROL_SHEETS` — e.g. `"Structured Rate + Credit"` — is **not** automatically skipped. It is scored the same as any other leftover sheet:

- If it carries a confident blotter signature (i.e. someone put real trade rows on a sheet that is normally just a summary tab), it is **parsed** and marked `auto_detected`, with the Diagnostics message additionally noting `"blotter-format data on a control-named sheet"`.
- If it does not carry a confident signature (the normal case — it really is just a summary/control tab), it is **skipped** and marked `control_present`, `rows: 0`.

This means a control-named sheet is judged purely by its column signature, not its name, so genuine blotter data is never lost just because it landed on a tab with a "summary"-sounding name — while an actual summary tab is never mistakenly parsed as trade data.

## Overview surfacing

Because `unrecognized` and `error` sheets mean rows were dropped, and this can otherwise go unnoticed outside the Diagnostics tab, the Overview control board (`renderOverview` → `renderSheetDetectionNotices`) shows:

- A `bad-note` at the top of the control board, listing every `unrecognized`/`error` sheet by name with its message, whenever at least one exists.
- A subordinate `blue-note` listing every `auto_detected` sheet (`'name' → Template`), so a reviewer can see when the app inferred a template by signature rather than by sheet name.

Both notices link to the Diagnostics tab (`activateTab("diagnostics")`) for the full per-sheet table, and both recompute on every `renderAll()` so they track the latest parse.
