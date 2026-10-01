// ALLTRADES — Analysis Readiness + Status Pipeline engine
// Pure functions. Reads a DailyAnalysis and returns a structured readiness report.

import type { DailyAnalysis, ChecklistItem, RuleCheck } from "@/lib/types";
import {
  READINESS_REQUIREMENTS,
  READINESS_GROUPS,
  READINESS_GROUP_LABEL,
  type ReadinessRequirement,
} from "@/lib/tags";

export interface ReadinessItem {
  key: string;
  label: string;
  group: ReadinessRequirement["group"];
  complete: boolean;
  hint?: string;
}

export interface ReadinessGroup {
  group: ReadinessRequirement["group"];
  label: string;
  total: number;
  complete: number;
}

export interface ReadinessReport {
  total: number;
  complete: number;
  percent: number;
  status: "ANALYSIS_READY" | "SETUP_WAITING" | "TRADE_READY" | "INCOMPLETE";
  items: ReadinessItem[];
  groups: ReadinessGroup[];
}

function itemComplete(
  analysis: DailyAnalysis,
  key: string
): { complete: boolean; hint?: string } {
  const checklist = analysis.confirmation_checklist ?? [];
  const findCheck = (k: string) => checklist.find((c) => c.key === k)?.checked ?? false;

  switch (key) {
    case "htf_bias":
      return {
        complete: !!analysis.higher_timeframe_bias,
        hint: !analysis.higher_timeframe_bias ? "Set higher timeframe bias" : undefined,
      };
    case "market_structure":
      return {
        complete: !!analysis.market_structure,
        hint: !analysis.market_structure ? "Set market structure" : undefined,
      };
    case "key_levels": {
      const levels = analysis.key_levels ?? [];
      const filled = levels.filter((l) => l.price && l.price.trim() !== "").length;
      return {
        complete: filled >= 3,
        hint: filled < 3 ? `Only ${filled}/3 minimum levels filled` : undefined,
      };
    }
    case "liquidity": {
      const liq = analysis.liquidity;
      const has =
        !!liq &&
        ((liq.buySidePrice && liq.buySidePrice.trim()) ||
          (liq.sellSidePrice && liq.sellSidePrice.trim()) ||
          (liq.expectedEvent && liq.expectedEvent.trim()));
      return {
        complete: !!has,
        hint: !has ? "Record buy/sell side liquidity or the expected event" : undefined,
      };
    }
    case "direction":
      return {
        complete: !!analysis.planned_direction,
        hint: !analysis.planned_direction ? "Set planned direction" : undefined,
      };
    case "entry":
      return {
        complete: analysis.planned_entry !== null,
        hint: analysis.planned_entry === null ? "Set entry price" : undefined,
      };
    case "sl":
      return {
        complete: analysis.planned_stop_loss !== null,
        hint: analysis.planned_stop_loss === null ? "Set stop loss" : undefined,
      };
    case "tp":
      return {
        complete: analysis.planned_take_profit !== null,
        hint: analysis.planned_take_profit === null ? "Set take profit" : undefined,
      };
    case "risk":
      return {
        complete: analysis.planned_risk_percent !== null,
        hint: analysis.planned_risk_percent === null ? "Set risk %" : undefined,
      };
    case "rr": {
      let rr = analysis.planned_rr;
      if (
        rr === null &&
        analysis.planned_entry !== null &&
        analysis.planned_stop_loss !== null &&
        analysis.planned_take_profit !== null
      ) {
        const risk = Math.abs(analysis.planned_entry - analysis.planned_stop_loss);
        const reward = Math.abs(analysis.planned_take_profit - analysis.planned_entry);
        if (risk > 0) {
          const raw = reward / risk;
          if (Number.isFinite(raw)) rr = Number(raw.toFixed(2));
        }
      }
      // Use epsilon so 2.00 never fails due to floating point
      const rrSafe = rr !== null ? Number(rr.toFixed(2)) : null;
      return {
        complete: rrSafe !== null && rrSafe >= 1.995,
        hint:
          rrSafe === null
            ? "Compute RR by setting entry / SL / TP"
            : rrSafe < 1.995
              ? `RR is 1:${rrSafe.toFixed(2)} — minimum required is 1:2`
              : undefined,
      };
    }
    case "structure_confirmed":
      return { complete: findCheck("structure") };
    case "liquidity_taken":
      return { complete: findCheck("liquidity") };
    case "candle":
      return { complete: findCheck("candle") };
    case "entry_reached":
      return { complete: findCheck("entry_zone") };
    case "risk_within_limit": {
      const rp = analysis.planned_risk_percent;
      return {
        complete: rp !== null && rp <= 0.25,
        hint: rp !== null && rp > 0.25 ? `Planned risk ${rp}% > 0.25%` : undefined,
      };
    }
    case "sl_in_range": {
      // Derive from prices if the stored value is missing
      let sl = analysis.planned_sl_pips;
      if (sl === null && analysis.planned_entry !== null && analysis.planned_stop_loss !== null) {
        const diff = Math.abs(analysis.planned_entry - analysis.planned_stop_loss);
        const pipSize =
          analysis.instrument === "USDJPY" || analysis.instrument === "GBPJPY"
            ? 0.01
            : analysis.instrument === "XAUUSD / Gold"
              ? 0.1
              : analysis.instrument === "NAS100" || analysis.instrument === "US30" || analysis.instrument === "SPX500"
                ? 1
                : 0.0001;
        const raw = diff / pipSize;
        if (Number.isFinite(raw)) sl = Number(raw.toFixed(1));
      }
      return {
        complete: sl !== null && sl >= 10 && sl <= 15,
        hint:
          sl === null
            ? "Enter SL as a price or set pip distance"
            : sl < 10 || sl > 15
              ? `SL is ${sl.toFixed(1)} pips — allowed range is 10–15`
              : undefined,
      };
    }
    case "rr_min": {
      // Derive from prices if the stored value is missing
      let rr = analysis.planned_rr;
      if (
        rr === null &&
        analysis.planned_entry !== null &&
        analysis.planned_stop_loss !== null &&
        analysis.planned_take_profit !== null
      ) {
        const risk = Math.abs(analysis.planned_entry - analysis.planned_stop_loss);
        const reward = Math.abs(analysis.planned_take_profit - analysis.planned_entry);
        if (risk > 0) {
          const raw = reward / risk;
          if (Number.isFinite(raw)) rr = Number(raw.toFixed(2));
        }
      }
      const rrSafe = rr !== null ? Number(rr.toFixed(2)) : null;
      return {
        complete: rrSafe !== null && rrSafe >= 1.995,
        hint:
          rrSafe === null
            ? "Enter entry, SL and TP to compute RR"
            : rrSafe < 1.995
              ? `RR 1:${rrSafe.toFixed(2)} < 1:2`
              : undefined,
      };
    }
    case "news_clear":
      return {
        complete: !analysis.news_major,
        hint: analysis.news_major ? "High-impact news marked" : undefined,
      };
    default:
      return { complete: false };
  }
}

export function computeReadiness(analysis: DailyAnalysis): ReadinessReport {
  const items: ReadinessItem[] = READINESS_REQUIREMENTS.map((req) => {
    const { complete, hint } = itemComplete(analysis, req.key);
    return {
      key: req.key,
      label: req.label,
      group: req.group,
      complete,
      hint,
    };
  });

  const total = items.length;
  const complete = items.filter((i) => i.complete).length;
  const percent = total > 0 ? Math.round((complete / total) * 100) : 0;

  const groups: ReadinessGroup[] = READINESS_GROUPS.map((g) => {
    const groupItems = items.filter((i) => i.group === g);
    return {
      group: g,
      label: READINESS_GROUP_LABEL[g],
      total: groupItems.length,
      complete: groupItems.filter((i) => i.complete).length,
    };
  });

  // Determine status
  const marketDone = items
    .filter((i) => i.group === "MARKET_CONTEXT")
    .every((i) => i.complete);
  const planDone = items
    .filter((i) => i.group === "TRADE_PLAN")
    .every((i) => i.complete);
  const confirmDone = items
    .filter((i) => i.group === "CONFIRMATION")
    .every((i) => i.complete);
  const riskDone = items
    .filter((i) => i.group === "RISK")
    .every((i) => i.complete);
  const newsDone = items.filter((i) => i.group === "NEWS").every((i) => i.complete);

  let status: ReadinessReport["status"] = "INCOMPLETE";
  if (marketDone && planDone && !confirmDone) status = "SETUP_WAITING";
  else if (marketDone && planDone && !riskDone) status = "SETUP_WAITING";
  else if (marketDone && planDone && confirmDone && riskDone && newsDone)
    status = "TRADE_READY";
  else if (marketDone && planDone) status = "ANALYSIS_READY";

  return { total, complete, percent, status, items, groups };
}

/**
 * Determine the pipeline stage of the analysis.
 * Distinct from readiness — this reflects the human workflow.
 */
export type PipelineStage =
  | "ANALYSIS"
  | "WAITING"
  | "CONFIRMATION"
  | "TRADE_CHECK"
  | "READY"
  | "TRADE_TAKEN"
  | "JOURNAL_REVIEW"
  | "RULE_REVIEW"
  | "LESSON";

export function computePipelineStage(
  analysis: DailyAnalysis,
  hasTrade: boolean
): PipelineStage {
  if (hasTrade) return "TRADE_TAKEN";
  const report = computeReadiness(analysis);
  if (report.status === "TRADE_READY") return "READY";
  if (report.status === "SETUP_WAITING") return "CONFIRMATION";
  if (report.status === "ANALYSIS_READY") return "TRADE_CHECK";
  return "ANALYSIS";
}

export const PIPELINE_LABEL: Record<PipelineStage, string> = {
  ANALYSIS: "Analysis",
  WAITING: "Waiting",
  CONFIRMATION: "Confirmation",
  TRADE_CHECK: "Trade Check",
  READY: "Ready",
  TRADE_TAKEN: "Trade Taken",
  JOURNAL_REVIEW: "Journal Review",
  RULE_REVIEW: "Rule Review",
  LESSON: "Lesson",
};

// ---------- Rule compliance engine ----------

export interface RuleEngineInput {
  direction: string | null;
  instrument: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  slPips: number | null;
  rr: number | null;
  riskPercent: number | null;
  newsMajor: boolean;
  tradesToday: number;
  tradesThisMonth: number;
  account: {
    allowed_instrument: string | null;
    min_sl_pips: number | null;
    max_sl_pips: number | null;
    min_rr: number | null;
    max_daily_trades: number | null;
    max_monthly_trades: number | null;
    forbid_high_impact_news: boolean | null;
  };
}

export function evaluateRules(input: RuleEngineInput): {
  checks: RuleCheck[];
  passed: number;
  total: number;
  allPass: boolean;
} {
  const checks: RuleCheck[] = [];

  // Instrument
  const allowed = input.account.allowed_instrument ?? "EURUSD";
  checks.push({
    key: "instrument",
    label: `Instrument: ${allowed}`,
    passed: input.instrument === allowed,
    detail: input.instrument !== allowed ? `Found ${input.instrument}` : undefined,
  });

  // SL range
  const minSL = input.account.min_sl_pips ?? 10;
  const maxSL = input.account.max_sl_pips ?? 15;
  checks.push({
    key: "sl_range",
    label: `SL ${minSL}–${maxSL} pips`,
    passed:
      input.slPips !== null && input.slPips >= minSL && input.slPips <= maxSL,
    detail:
      input.slPips !== null && (input.slPips < minSL || input.slPips > maxSL)
        ? `Found ${input.slPips.toFixed(1)} pips`
        : undefined,
  });

  // RR minimum
  const minRR = input.account.min_rr ?? 2;
  checks.push({
    key: "rr_min",
    label: `RR ≥ 1:${minRR}`,
    passed: input.rr !== null && input.rr >= minRR,
    detail:
      input.rr !== null && input.rr < minRR
        ? `Found 1:${input.rr.toFixed(2)}`
        : undefined,
  });

  // Risk
  checks.push({
    key: "risk_limit",
    label: "Risk ≤ 0.25%",
    passed: input.riskPercent !== null && input.riskPercent <= 0.25,
    detail:
      input.riskPercent !== null && input.riskPercent > 0.25
        ? `Found ${input.riskPercent}%`
        : undefined,
  });

  // News
  const forbidNews = input.account.forbid_high_impact_news ?? true;
  checks.push({
    key: "news",
    label: "No high-impact news",
    passed: !forbidNews || !input.newsMajor,
    detail: forbidNews && input.newsMajor ? "High-impact news marked" : undefined,
  });

  // Daily trades
  const maxDaily = input.account.max_daily_trades ?? 1;
  checks.push({
    key: "daily_trades",
    label: `${maxDaily} trade${maxDaily > 1 ? "s" : ""}/day`,
    passed: input.tradesToday < maxDaily,
    detail: input.tradesToday >= maxDaily ? `Already ${input.tradesToday}` : undefined,
  });

  // Monthly trades
  const maxMonthly = input.account.max_monthly_trades ?? 12;
  checks.push({
    key: "monthly_trades",
    label: `${maxMonthly} trades/month`,
    passed: input.tradesThisMonth < maxMonthly,
    detail:
      input.tradesThisMonth >= maxMonthly
        ? `Already ${input.tradesThisMonth}`
        : undefined,
  });

  const passed = checks.filter((c) => c.passed).length;
  return { checks, passed, total: checks.length, allPass: passed === checks.length };
}

export function computeRuleCompliancePercent(checks: RuleCheck[]): number {
  if (checks.length === 0) return 100;
  const passed = checks.filter((c) => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}




