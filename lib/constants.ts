// ALLTRADES — Field option constants

export const INSTRUMENTS = [
  "EURUSD",
  "XAUUSD / Gold",
  "GBPUSD",
  "USDJPY",
  "GBPJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NAS100",
  "US30",
  "SPX500",
  "Other",
] as const;

export const DIRECTIONS = ["Buy", "Sell"] as const;
export const RESULTS = ["Win", "Loss", "Breakeven"] as const;

export const RISK_REWARD_OPTIONS = [
  "1 : 1",
  "1 : 2",
  "1 : 3",
  "1 : 4",
  "1 : 5",
  "Other",
] as const;

export const STRATEGIES = [
  "ICT",
  "Smart Money Concepts",
  "Breakout & Pullback",
  "Trend Following",
  "Reversal",
  "Scalping",
  "Other",
] as const;

export const SETUP_TYPES = [
  "Order Block",
  "Fair Value Gap",
  "Break of Structure",
  "Change of Character",
  "Liquidity Sweep",
  "Support & Resistance",
  "Breakout",
  "Pullback",
  "Double Top",
  "Double Bottom",
  "Other",
] as const;

export const TIMEFRAMES = [
  "1 Minute",
  "5 Minutes",
  "15 Minutes",
  "30 Minutes",
  "1 Hour",
  "4 Hours",
  "Daily",
] as const;

export const SESSIONS = ["Asian", "London", "New York"] as const;
export const MARKET_BIAS_OPTIONS = ["Bullish", "Bearish", "Neutral"] as const;

export const ENTRY_MODELS = [
  "FVG Entry",
  "Order Block Entry",
  "Liquidity Sweep",
  "BOS / CHoCH",
  "Break & Retest",
  "Rejection",
  "Other",
] as const;

export const LIQUIDITY_TAKEN_OPTIONS = [
  "Buy-Side Liquidity",
  "Sell-Side Liquidity",
  "Both",
  "None",
] as const;

export const NEWS_EVENTS = [
  "No Major News",
  "High Impact News",
  "CPI",
  "NFP",
  "FOMC",
  "Interest Rate Decision",
  "Other",
] as const;

export const MARKET_STRUCTURE_OPTIONS = [
  "Bullish Structure",
  "Bearish Structure",
  "Range",
  "Expansion",
  "Consolidation",
  "Break of Structure",
  "Change of Character",
  "Other",
] as const;

export const LIQUIDITY_FOCUS_OPTIONS = [
  "Buy-Side Liquidity",
  "Sell-Side Liquidity",
  "Both",
  "None",
] as const;

export const FVG_OPTIONS = ["Present", "Not Present", "Unclear"] as const;

export const ORDER_BLOCK_OPTIONS = [
  "Bullish",
  "Bearish",
  "Both",
  "None",
] as const;

export const BOS_CHOCH_OPTIONS = [
  "BOS Bullish",
  "BOS Bearish",
  "CHOCH Bullish",
  "CHOCH Bearish",
  "None",
] as const;

export const ANALYSIS_SETUPS = [
  "FVG",
  "Order Block",
  "Liquidity Sweep",
  "BOS",
  "CHOCH",
  "Break & Retest",
  "Rejection",
  "Multiple Confluence",
  "Other",
] as const;

export const CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const;

export const ANALYSIS_OUTCOMES = [
  "Still Pending",
  "Correct",
  "Partially Correct",
  "Incorrect",
] as const;

export const WITHDRAWAL_STATUSES = [
  "Recorded",
  "Pending",
  "Approved",
  "Paid",
] as const;

export const SCREENSHOT_MAX_BYTES = 6 * 1024 * 1024;
export const SCREENSHOT_MAX_COUNT = 6;
export const SCREENSHOT_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const NOT_SPECIFIED = "Not specified";
