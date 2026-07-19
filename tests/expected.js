// Expected assertion matrix for centralised_blotter_mapping_studio.html
// Rows are indexed 0-6 matching the parse order emitted by window.__BOARD_SNAPSHOT():
//   0 = TC01 Structured FI (structured_fi_current)
//   1 = TC02 Linear Zero (linear_zero_existing)
//   2 = TC03 Collar
//   3 = TC04 Illiquid Credit + Repack
//   4 = TC05 Structured Credit 2025 (CLN)
//   5 = TC06 Structured Credit 2025 (Private Credit)
//   6 = TC07 Equity TRS
//
// Parse order in the app (parseWorkbook): StructuredFi sheets, then Collar,
// then Illiquid, then StructuredCredit2025 (both CLN + Private Credit rows come
// from this one sheet, CLN row first per fixture), then Trs.

// ---- Baseline scenario: default settings (illiquidStatusToBuySell=new_fee_to_sell, trsFxConvention=multiply) ----
const BASELINE = {
  settings: { illiquidStatusToBuySell: "new_fee_to_sell", trsFxConvention: "multiply" },
  checks: [
    {
      id: "TC01",
      index: 0,
      expect: {
        quality: "CLEAN_PASS",
        tradeId: "4204720592",
        tier1: "Structured Credit",
        tier2: "Structured Credit",
        tier3: "Credit Linked Notes",
        tradeDate: "23/02/2026",
        primaryCcy: "USD",
        volume: "1000000",
        va: "10742",
        treats: "NOSGSGH"
      },
      commentContains: ["source_layout=structured_fi_current", "native_trade_ref=XS3307267255", "coupon=", "first_reoffer="]
    },
    {
      id: "TC02",
      index: 1,
      expect: {
        quality: "CLEAN_PASS",
        tradeId: "3329199354",
        tier1: "Markets",
        tier2: "Structured Products",
        tier3: "Structured Rates",
        tradeDate: "18/07/2026",
        primaryCcy: "USD",
        volume: "2000000",
        va: "2500",
        treats: "HRCHHKH",
        legalEntity: "HBAP",
        salesClientCountry: "HK", // inherited from PB book routing (HK -> HK / FBL)
        salesClientType: "FBL"
      },
      commentContains: ["source_layout=linear_zero_existing", "native_trade_ref=XS0000000001"]
    },
    {
      id: "TC03",
      index: 2,
      expect: {
        quality: "CLEAN_PASS",
        tradeId: "2381983830",
        tier1: "Markets",
        tier2: "Equity Derivatives",
        tier3: "Collar / Options",
        tradeDate: "31/10/2023",
        volume: "4613500",
        va: "23493",
        pc: "46135",
        buySell: "Buy",
        treats: "HASEHKP"
      },
      commentContains: []
    },
    {
      id: "TC04",
      index: 3,
      expect: {
        quality: "CLEAN_PASS",
        tradeId: "2810938652",
        tier1: "Structured Credit",
        tier2: "Structured Credit",
        tier3: "Structured Credit Notes",
        tradeDate: "18/07/2026",
        volume: "3000000",
        va: "45000",
        buySell: "Sell", // NEW BEHAVIOR: Status "New" -> Sell under default illiquidStatusToBuySell
        treats: "HASEHKP"
      },
      commentContains: ["status=New"]
    },
    {
      id: "TC05",
      index: 4,
      expect: {
        quality: "FAIL",
        tradeId: "2635637780",
        tier1: "Structured Credit",
        tier2: "Structured Credit",
        tier3: "Credit Linked Notes",
        tradeDate: "",
        volume: "5000000",
        va: "100000"
      },
      commentContains: []
    },
    {
      id: "TC06",
      index: 5,
      expect: {
        quality: "FAIL",
        tradeId: "5141050790",
        assetClass: "Private Credit",
        tier1: "Private Credit Primary",
        tier2: "Private Placement",
        tier3: "Private Placement",
        volume: "6000000",
        va: "120000"
      },
      commentContains: []
    },
    {
      id: "TC07",
      index: 6,
      expect: {
        quality: "CLEAN_PASS",
        tradeId: "123456",
        tier1: "Markets",
        tier2: "Equity Derivatives",
        tier3: "Total Return Swap",
        tradeDate: "18/07/2026",
        volume: "7000000",
        va: "200000",
        pc: "9984", // NEW: 78000 * 0.128 under default "multiply" convention
        buySell: "Buy",
        treats: "NOSGSGH"
      },
      commentContains: []
    }
  ]
};

// ---- Illiquid Buy/Sell "off" toggle: TC04 Buy/Sell should be blank ----
const ILLIQUID_OFF = {
  settings: { illiquidStatusToBuySell: "off", trsFxConvention: "multiply" },
  checks: [
    {
      id: "TC04-off",
      index: 3,
      expect: {
        tradeId: "2810938652",
        buySell: ""
      },
      commentContains: ["status=New"]
    }
  ]
};

// ---- TRS FX convention "divide": TC07 PC should be 78000 / 0.128 = 609375 ----
const TRS_DIVIDE = {
  settings: { illiquidStatusToBuySell: "new_fee_to_sell", trsFxConvention: "divide" },
  checks: [
    {
      id: "TC07-divide",
      index: 6,
      expect: {
        tradeId: "123456",
        pc: "609375"
      },
      commentContains: []
    }
  ]
};

// ---- Comment economics tokens present on Structured FI / Collar rows (checked against BASELINE snapshot) ----
const ECONOMICS_TOKEN_CHECKS = [
  { id: "TC01-economics", index: 0, tokensAnyOf: ["coupon=", "first_reoffer="] },
  { id: "TC03-economics", index: 2, tokensAnyOf: ["strike_pct=", "num_options=", "strike_level=", "initial_fixing=", "option_premium=", "client_price=", "total_gnbv_bps="] }
];

module.exports = { BASELINE, ILLIQUID_OFF, TRS_DIVIDE, ECONOMICS_TOKEN_CHECKS };
