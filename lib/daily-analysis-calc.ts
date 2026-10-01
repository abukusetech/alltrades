// ALLTRADES — Daily Analysis calculations
// Pure functions, safe returns. No fabricated values.

import type {
  DailyAnalysis,
  ChecklistItem,
  KeyLevel,
  Scenario,
  TimeframeAnalysis,
  LiquidityPlan,
  EndOfDayReview,
} from "@/lib/types";

// ---------- Defaults ----------

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "structure", label: "Market structure confirmed", checked: false },
  { key: "liquidity", label: "Liquidity taken", checked: false },
  { key: "entry_zone", label: "Entry zone reached", checked: false },
  { key: "candle", label: "Confirmation candle formed", checked: false },
  { key: "direction", label: "Direction confirmed", checked: false },
  { key: "news", label: "No major news", checked: false },
  { key: "sl", label: "SL defined", checked: false },
  { key: "tp", label: "TP defined", checked: false },
  { key: "rr", label: "RR ≥ 1:2", checked: false },
  { key: "risk", label: "Risk ≤ planned risk", checked: false },
];

export const DEFAULT_KEY_LEVELS: KeyLevel[] = [
  { id: "pdh", name: "Previous Day High", price: "", type: "Resistance", notes: "" },
  { id: "pdl", name: "Previous Day Low", price: "", type: "Support", notes: "" },
  { id: "asia_h", name: "Asian High", price: "", type: "Resistance", notes: "" },
  { id: "asia_l", name: "Asian Low", price: "", type: "Support", notes: "" },
  { id: "london_h", name: "London High", price: "", type: "Resistance", notes: "" },
  { id: "london_l", name: "London Low", price: "", type: "Support", notes: "" },
  { id: "sup", name: "Major Support", price: "", type: "Support", notes: "" },
  { id: "res", name: "Major Resistance", price: "", type: "Resistance", notes: "" },
  { id: "liq", name: "Liquidity Zone", price: "", type: "Liquidity", notes: "" },
  { id: "entry", name: "Entry Zone", price: "", type: "Entry", notes: "" },
  { id: "inv", name: "Invalidation Level", price: "", type: "Invalidation", notes: "" },
];

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "A",
    label: "Scenario A — BUY",
    ifText: "Price sweeps sell-side liquidity and gives bullish confirmation.",
    thenText: "Look for BUY entry.",
    slText: "10–15 pips",
    tpText: "1:2",
  },
  {
    id: "B",
    label: "Scenario B — SELL",
    ifText: "Price rejects resistance and gives bearish confirmation.",
    thenText: "Look for SELL entry.",
    slText: "10–15 pips",
    tpText: "1:2",
  },
  {
    id: "C",
    label: "Scenario C — NO TRADE",
    ifText: "No confirmation appears.",
    thenText: "NO TRADE.",
    slText: "",
    tpText: "",
  },
];

export const DEFAULT_LIQUIDITY: LiquidityPlan = {
  buySidePrice: "",
  buySideNotes: "",
  sellSidePrice: "",
  sellSideNotes: "",
  expectedEvent: "",
};

export const DEFAULT_END_OF_DAY: EndOfDayReview = {
  followedPlan: "",
  marketAsExpected: "",
  tookTrade: "",
  tradeConfirmed: "",
  riskRespected: "",
  slRespected: "",
  tpRespected: "",
  rrFollowed: "",
  madeMistakes: "",
  whatLearned: "",
};

export const DEFAULT_TF: TimeframeAnalysis = {
  trend: "",
  structure: "",
  keyLevels: "",
  liquidity: "",
  zone: "",
  entryArea: "",
  confirmation: "",
  trigger: "",
  slArea: "",
  tpArea: "",
  notes: "",
  collapsed: false,
};

// ---------- Calculations ----------

export function pipsFromPrices(
  entry: number | null,
  stop: number | null,
  instrument = "EURUSD"
): number | null {
  if (entry === null || stop === null) return null;
  if (!Number.isFinite(entry) || !Number.isFinite(stop)) return null;

  const pipSize =
    instrument === "USDJPY" || instrument === "GBPJPY"
      ? 0.01
      : instrument === "XAUUSD / Gold"
        ? 0.1
        : instrument === "NAS100" || instrument === "US30" || instrument === "SPX500"
          ? 1
          : 0.0001;

  // Detect pip-count-in-price-field: one value is a realistic price,
  // the other is a small integer (0–500) that's clearly not a price.
  const maxPriceForInstrument =
    instrument === "USDJPY" || instrument === "GBPJPY"
      ? 1000
      : instrument === "XAUUSD / Gold"
        ? 100000
        : 10;

  const entryLooksLikePrice = entry > maxPriceForInstrument * 0.05;
  const stopLooksLikePrice = stop > maxPriceForInstrument * 0.05;

  if (entryLooksLikePrice && !stopLooksLikePrice) return Math.abs(stop);
  if (!entryLooksLikePrice && stopLooksLikePrice) return Math.abs(entry);
  if (!entryLooksLikePrice && !stopLooksLikePrice) return null;

  const diff = Math.abs(entry - stop);
  return diff / pipSize;
}
export function pipsToPrice(pips: number, instrument = "EURUSD"): number {
  const pipSize =
    instrument === "USDJPY" || instrument === "GBPJPY"
      ? 0.01
      : instrument === "XAUUSD / Gold"
        ? 0.1
        : instrument === "NAS100" || instrument === "US30" || instrument === "SPX500"
          ? 1
          : 0.0001;
  return pips * pipSize;
}

export function computeRR(
  entry: number | null,
  sl: number | null,
  tp: number | null
): number | null {
  if (entry === null || sl === null || tp === null) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk <= 0 || !Number.isFinite(risk) || !Number.isFinite(reward)) return null;
  const raw = reward / risk;
  if (!Number.isFinite(raw)) return null;
  // Round to 2 decimals so 12/24 pips reads as exactly 2.00, not 1.9999998
  return Number(raw.toFixed(2));
}

export function computeRiskAmount(
  startingCapital: number,
  riskPercent: number
): number {
  if (!Number.isFinite(startingCapital) || !Number.isFinite(riskPercent)) return 0;
  return (startingCapital * riskPercent) / 100;
}

export function computeExpectedProfit(
  riskAmount: number,
  rr: number | null
): number {
  if (rr === null || !Number.isFinite(rr)) return 0;
  return riskAmount * rr;
}

export function computeConfirmationScore(checklist: ChecklistItem[]): {
  checked: number;
  total: number;
  percent: number;
  allChecked: boolean;
} {
  const total = checklist.length;
  const checked = checklist.filter((c) => c.checked).length;
  const percent = total > 0 ? (checked / total) * 100 : 0;
  return { checked, total, percent, allChecked: total > 0 && checked === total };
}

export function computeAnalysisAccuracy(
  analysis: DailyAnalysis,
  mistakesCount: number
): number | null {
  let available = 0;
  let earned = 0;

  const directionMatch =
    analysis.planned_direction &&
    analysis.actual_direction &&
    analysis.planned_direction === analysis.actual_direction;

  if (analysis.planned_direction && analysis.actual_direction) {
    available += 40;
    if (directionMatch) earned += 40;
  }

  const hasEntry = analysis.planned_entry !== null;
  const hasActualRange =
    analysis.actual_high !== null || analysis.actual_low !== null;
  if (hasEntry && hasActualRange) {
    available += 25;
    const e = Number(analysis.planned_entry);
    const high = analysis.actual_high !== null ? Number(analysis.actual_high) : null;
    const low = analysis.actual_low !== null ? Number(analysis.actual_low) : null;
    const inRange = (high === null || e <= high) && (low === null || e >= low);
    if (inRange) earned += 25;
  }

  const hasInvalidation =
    !!analysis.invalidation && analysis.invalidation.trim().length > 0;
  if (hasInvalidation) {
    available += 20;
    const outcome = (analysis.market_outcome ?? "").toLowerCase();
    if (
      outcome.includes("held") ||
      outcome.includes("correct") ||
      outcome.includes("followed") ||
      outcome.includes("respect")
    ) {
      earned += 20;
    } else if (analysis.analysis_result === "Correct") {
      earned += 20;
    } else if (analysis.analysis_result === "Partially Correct") {
      earned += 10;
    }
  }

  if (analysis.confirmation_checklist && analysis.confirmation_checklist.length > 0) {
    available += 15;
    if (
      analysis.analysis_result === "Correct" ||
      analysis.analysis_result === "Partially Correct"
    ) {
      earned += 15;
    }
  }

  if (available === 0) return null;

  let score = (earned / available) * 100;
  const penalty = Math.min(mistakesCount * 5, 25);
  score = Math.max(0, score - penalty);

  return Math.round(score);
}

export function deriveStatus(analysis: DailyAnalysis): DailyAnalysis["status"] {
  if (analysis.status === "TRADE_TAKEN") return "TRADE_TAKEN";
  if (analysis.status === "INVALIDATED") return "INVALIDATED";
  if (analysis.status === "NO_TRADE") return "NO_TRADE";

  const checklist = analysis.confirmation_checklist ?? [];
  if (checklist.length > 0 && checklist.every((c) => c.checked)) {
    return "SETUP_CONFIRMED";
  }
  if (checklist.some((c) => c.checked)) {
    return "WAITING_FOR_CONFIRMATION";
  }
  return analysis.status ?? "ANALYSIS_CREATED";
}

export interface DailyAnalysisWeekSummary {
  days: number;
  validSetups: number;
  trades: number;
  noTradeDays: number;
  correctCount: number;
  partiallyCount: number;
  incorrectCount: number;
  correctPercent: number | null;
  mostCommonMistake: string | null;
  averageRR: number | null;
  averageRiskPercent: number | null;
  followedPlanCount: number;
  followedPlanPercent: number | null;
}

export function summarizeDailyAnalysisWeek(
  analyses: DailyAnalysis[],
  tradesCount: number
): DailyAnalysisWeekSummary {
  const days = analyses.length;
  const validSetups = analyses.filter(
    (a) => a.status === "SETUP_CONFIRMED" || a.status === "TRADE_TAKEN"
  ).length;
  const noTradeDays = analyses.filter((a) => a.status === "NO_TRADE").length;

  const correctCount = analyses.filter((a) => a.analysis_result === "Correct").length;
  const partiallyCount = analyses.filter((a) => a.analysis_result === "Partially Correct").length;
  const incorrectCount = analyses.filter((a) => a.analysis_result === "Incorrect").length;

  const resolved = correctCount + partiallyCount + incorrectCount;
  const correctPercent = resolved > 0 ? (correctCount / resolved) * 100 : null;

  const mistakeCounts = new Map<string, number>();
  for (const a of analyses) {
    for (const m of a.mistakes ?? []) {
      mistakeCounts.set(m, (mistakeCounts.get(m) ?? 0) + 1);
    }
  }
  let mostCommonMistake: string | null = null;
  let maxCount = 0;
  for (const [m, c] of mistakeCounts) {
    if (c > maxCount) {
      maxCount = c;
      mostCommonMistake = m;
    }
  }

  const rrs = analyses
    .map((a) => a.planned_rr)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const averageRR =
    rrs.length > 0 ? rrs.reduce((s, v) => s + v, 0) / rrs.length : null;

  const risks = analyses
    .map((a) => a.planned_risk_percent)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const averageRiskPercent =
    risks.length > 0 ? risks.reduce((s, v) => s + v, 0) / risks.length : null;

  const followedPlanCount = analyses.filter(
    (a) => a.end_of_day_review?.followedPlan === "YES"
  ).length;
  const followedPlanPercent = days > 0 ? (followedPlanCount / days) * 100 : null;

  return {
    days,
    validSetups,
    trades: tradesCount,
    noTradeDays,
    correctCount,
    partiallyCount,
    incorrectCount,
    correctPercent,
    mostCommonMistake,
    averageRR,
    averageRiskPercent,
    followedPlanCount,
    followedPlanPercent,
  };
}



