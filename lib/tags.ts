// ALLTRADES — Central tag dictionary
// Every tag group used across Daily Analysis, Journal, Analytics, Weekly Review.

export const BIAS_TAGS = [
  "Bullish",
  "Bearish",
  "Neutral",
  "Range",
  "Strong Bullish",
  "Strong Bearish",
  "Waiting",
] as const;

export const STRUCTURE_TAGS = [
  "BOS",
  "CHoCH",
  "Higher High",
  "Higher Low",
  "Lower High",
  "Lower Low",
  "Range",
  "Expansion",
  "Consolidation",
  "Unclear",
] as const;

export const LIQUIDITY_TAGS = [
  "Buy-side liquidity",
  "Sell-side liquidity",
  "Equal highs",
  "Equal lows",
  "Previous day high",
  "Previous day low",
  "Session high",
  "Session low",
  "Liquidity sweep",
  "No clear liquidity",
] as const;

export const SETUP_TAGS = [
  "Liquidity Sweep",
  "Break of Structure",
  "CHoCH",
  "Retest",
  "Continuation",
  "Reversal",
  "Support/Resistance",
  "Other",
] as const;

export const SESSION_TAGS = [
  "Asian",
  "London",
  "New York",
  "London/NY overlap",
] as const;

export const NEWS_TAGS = [
  "No high-impact news",
  "High-impact news",
  "CPI",
  "NFP",
  "FOMC",
  "ECB",
  "Fed",
  "Other",
] as const;

export const ENTRY_REASON_TAGS = [
  "Liquidity sweep",
  "Structure confirmation",
  "Retest",
  "Breakout",
  "Reversal",
  "Continuation",
  "Support",
  "Resistance",
  "Other",
] as const;

export const EXIT_REASON_TAGS = [
  "TP hit",
  "SL hit",
  "Manual close",
  "Partial close",
  "Structure invalidated",
  "Early exit",
  "Other",
] as const;

export const MANAGEMENT_TAGS = [
  "Held to TP",
  "Moved SL",
  "Partial profit",
  "BE",
  "Manual management",
  "No intervention",
  "Early management",
  "Other",
] as const;

export const WELL_TAGS = [
  "Followed plan",
  "Correct risk",
  "Good entry",
  "Good patience",
  "Waited for confirmation",
  "Good SL placement",
  "Good TP placement",
  "Followed 1:2 RR",
  "No emotional decision",
  "No overtrading",
  "Good management",
  "Stayed out during news",
  "Other",
] as const;

export const MISTAKE_TAGS = [
  "Entered too early",
  "Entered late",
  "FOMO",
  "Revenge trade",
  "Over-risked",
  "Moved SL",
  "Closed TP early",
  "Ignored confirmation",
  "Traded news",
  "Took second trade",
  "Ignored market structure",
  "Poor RR",
  "Wrong lot size",
  "Emotional entry",
  "Forced setup",
  "Chased price",
  "Ignored invalidation",
  "Changed plan during trade",
  "Entered outside planned zone",
  "Poor timing",
  "Poor session selection",
  "Failed to journal",
  "No mistake",
  "Other",
] as const;

export const EMOTION_TAGS = [
  "Calm",
  "Confident",
  "Neutral",
  "Nervous",
  "Fearful",
  "Impatient",
  "FOMO",
  "Frustrated",
  "Angry",
  "Revenge",
  "Overconfident",
  "Hesitant",
] as const;

export const MARKET_TAGS = [
  "Strong trend",
  "Weak trend",
  "Range",
  "Volatile",
  "Low volatility",
  "Liquidity-heavy",
  "Choppy",
  "Clean structure",
  "Messy structure",
  "Unexpected move",
  "News-driven",
  "Other",
] as const;

export const LESSON_TAGS = [
  "Patience",
  "Wait for confirmation",
  "Respect risk",
  "Respect SL",
  "Respect TP",
  "Do not chase",
  "Do not force setups",
  "Follow the plan",
  "Improve entry timing",
  "Improve management",
  "Avoid news",
  "Improve analysis",
  "Other",
] as const;

// ---------- Readiness requirements ----------

export interface ReadinessRequirement {
  key: string;
  label: string;
  group: "MARKET_CONTEXT" | "TRADE_PLAN" | "CONFIRMATION" | "RISK" | "NEWS";
}

export const READINESS_REQUIREMENTS: ReadinessRequirement[] = [
  // Market context
  { key: "htf_bias", label: "Higher timeframe bias", group: "MARKET_CONTEXT" },
  { key: "market_structure", label: "Market structure", group: "MARKET_CONTEXT" },
  { key: "key_levels", label: "Key levels", group: "MARKET_CONTEXT" },
  { key: "liquidity", label: "Liquidity", group: "MARKET_CONTEXT" },

  // Trade plan
  { key: "direction", label: "Direction", group: "TRADE_PLAN" },
  { key: "entry", label: "Entry", group: "TRADE_PLAN" },
  { key: "sl", label: "Stop loss", group: "TRADE_PLAN" },
  { key: "tp", label: "Take profit", group: "TRADE_PLAN" },
  { key: "risk", label: "Risk", group: "TRADE_PLAN" },
  { key: "rr", label: "RR", group: "TRADE_PLAN" },

  // Confirmation
  { key: "structure_confirmed", label: "Structure confirmed", group: "CONFIRMATION" },
  { key: "liquidity_taken", label: "Liquidity taken", group: "CONFIRMATION" },
  { key: "candle", label: "Confirmation candle", group: "CONFIRMATION" },
  { key: "entry_reached", label: "Entry zone reached", group: "CONFIRMATION" },

  // Risk
  { key: "risk_within_limit", label: "Risk within limit", group: "RISK" },
  { key: "sl_in_range", label: "SL within 10–15 pips", group: "RISK" },
  { key: "rr_min", label: "RR ≥ 1:2", group: "RISK" },

  // News
  { key: "news_clear", label: "No high-impact news", group: "NEWS" },
];

export const READINESS_GROUPS: ReadinessRequirement["group"][] = [
  "MARKET_CONTEXT",
  "TRADE_PLAN",
  "CONFIRMATION",
  "RISK",
  "NEWS",
];

export const READINESS_GROUP_LABEL: Record<
  ReadinessRequirement["group"],
  string
> = {
  MARKET_CONTEXT: "Market Context",
  TRADE_PLAN: "Trade Plan",
  CONFIRMATION: "Confirmation",
  RISK: "Risk",
  NEWS: "News",
};
