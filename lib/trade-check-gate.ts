// ALLTRADES — Strict trade check gate
//
// Every condition is PASS, FAIL, or NOT_CONFIRMED. No auto-ticking.
// READY only when every mandatory condition passes.

import type { Account, DailyAnalysis, SetupConfirmation } from "@/lib/types";
import type { PositionResult } from "@/lib/position-math";

export type CheckStatus = "PASS" | "FAIL" | "NOT_CONFIRMED";
export type GateStatus =
  | "ANALYSIS_INCOMPLETE"
  | "WAITING_FOR_SETUP"
  | "WAITING_FOR_CONFIRMATION"
  | "BLOCKED"
  | "INVALIDATED"
  | "READY"
  | "TRADE_TAKEN";

export interface GateCheck {
  key: string;
  label: string;
  status: CheckStatus;
  reason: string | null;
  severity: "mandatory" | "informational";
}

export interface GateResult {
  status: GateStatus;
  checks: GateCheck[];
  blockers: string[];
  warnings: string[];
  ready: boolean;
}

const DEFAULT_CONFIRMATION: SetupConfirmation = {
  market_structure_supports: false,
  liquidity_met: false,
  entry_zone_reached: false,
  confirmation_candle: false,
};

export interface GateInput {
  analysis: DailyAnalysis | null;
  position: PositionResult | null;
  account: Account | null;
  hasTradeToday: boolean;
}

export function computeGate(input: GateInput): GateResult {
  const checks: GateCheck[] = [];
  const { analysis, position, account } = input;

  // ---- 1. Analysis exists and matches today
  checks.push({
    key: "analysis_exists",
    label: "Daily Analysis saved for today",
    status: analysis ? "PASS" : "FAIL",
    reason: analysis ? null : "No daily analysis saved for today",
    severity: "mandatory",
  });

  // ---- 2. HTF bias defined
  checks.push({
    key: "htf_bias",
    label: "Higher-timeframe bias defined",
    status: analysis?.higher_timeframe_bias ? "PASS" : "FAIL",
    reason: analysis?.higher_timeframe_bias ? null : "Set higher-timeframe bias in Daily Analysis",
    severity: "mandatory",
  });

  // ---- 3. Market structure defined
  checks.push({
    key: "market_structure",
    label: "Market structure defined",
    status: analysis?.market_structure ? "PASS" : "FAIL",
    reason: analysis?.market_structure ? null : "Set market structure in Daily Analysis",
    severity: "mandatory",
  });

  // ---- 4. Direction selected
  const direction = analysis?.planned_direction ?? null;
  checks.push({
    key: "direction_selected",
    label: "Trade direction (BUY/SELL) selected",
    status: direction === "BUY" || direction === "SELL" ? "PASS" : "FAIL",
    reason:
      direction === "BUY" || direction === "SELL"
        ? null
        : direction === "WAIT"
          ? "Direction is WAIT — no trade permitted"
          : "No direction selected",
    severity: "mandatory",
  });

  // ---- 5. Instrument supported
  const instrument = analysis?.instrument ?? "";
  const supported =
    instrument === "EURUSD" || instrument === "XAUUSD" || instrument === "XAUUSD / Gold";
  checks.push({
    key: "instrument_supported",
    label: "Instrument is EURUSD or XAUUSD",
    status: supported ? "PASS" : "FAIL",
    reason: supported ? null : `Unsupported instrument: ${instrument || "(none)"}`,
    severity: "mandatory",
  });

  // ---- 6. Entry / SL / TP defined
  const entry = analysis?.planned_entry ?? null;
  const sl = analysis?.planned_stop_loss ?? null;
  const tp = analysis?.planned_take_profit ?? null;
  checks.push({
    key: "prices_defined",
    label: "Entry, stop loss and take profit set",
    status: entry !== null && sl !== null && tp !== null ? "PASS" : "FAIL",
    reason:
      entry !== null && sl !== null && tp !== null
        ? null
        : "Fill in entry, SL and TP in the trade plan",
    severity: "mandatory",
  });

  // ---- 7. Price relationships
  let priceRelationOk = false;
  let priceRelationReason: string | null = "Prices not yet valid";
  if (direction === "BUY" && entry !== null && sl !== null && tp !== null) {
    priceRelationOk = sl < entry && tp > entry;
    priceRelationReason = priceRelationOk ? null : "BUY requires SL below entry and TP above entry";
  } else if (direction === "SELL" && entry !== null && sl !== null && tp !== null) {
    priceRelationOk = sl > entry && tp < entry;
    priceRelationReason = priceRelationOk ? null : "SELL requires SL above entry and TP below entry";
  }
  checks.push({
    key: "price_relations",
    label: "SL / TP positioned correctly for direction",
    status: priceRelationOk ? "PASS" : "FAIL",
    reason: priceRelationReason,
    severity: "mandatory",
  });

  // ---- 8. Position calculator complete
  checks.push({
    key: "position_complete",
    label: "Lot size calculated",
    status: position?.complete ? "PASS" : "FAIL",
    reason: position?.complete ? null : (position?.reason ?? "Position calculator not complete"),
    severity: "mandatory",
  });

  // ---- 9. R:R ≥ 2.00
  const rr = position?.rr ?? null;
  const rrOk = rr !== null && rr >= 1.995;
  checks.push({
    key: "rr_minimum",
    label: "Reward-to-risk ratio ≥ 1:2",
    status: rrOk ? "PASS" : "FAIL",
    reason: rrOk ? null : rr !== null ? `R:R is 1:${rr.toFixed(2)} — minimum is 1:2` : "R:R not calculated",
    severity: "mandatory",
  });

  // ---- 10. Risk within personal limit (max 1% for safety unless configured)
  const riskPct = analysis?.planned_risk_percent ?? 0;
  const maxRiskPct = account?.account_type === "MAVEN"
    ? account.maven_rules?.max_risk_per_trade_percent ?? account.personal_risk_percent ?? 1.0
    : account?.personal_risk_percent ?? 1.0;
  const riskOk = riskPct > 0 && riskPct <= maxRiskPct + 0.0001;
  checks.push({
    key: "risk_limit",
    label: `Risk ≤ ${maxRiskPct}% per trade`,
    status: riskOk ? "PASS" : "FAIL",
    reason: riskOk
      ? null
      : riskPct <= 0
        ? "Set risk percentage in the trade plan"
        : `Risk ${riskPct.toFixed(2)}% exceeds ${maxRiskPct}%`,
    severity: "mandatory",
  });

  // ---- 11. Read the current confirmation model, with legacy fallback
  const decision = analysis?.daily_decision ?? null;
  const newConfirmationKeys = [
    ["htf_alignment", "Higher-timeframe alignment"],
    ["structure_confirmed", "Market structure confirmed"],
    ["direction_confirmed", "Direction confirmed"],
    ["liquidity_taken", "Liquidity taken"],
    ["entry_zone_reached", "Entry zone reached"],
    ["displacement_present", "Displacement present"],
    ["confirmation_candle", "Confirmation candle formed"],
    ["no_news_exposure", "No prohibited high-impact news exposure"],
    ["sl_defined", "Stop loss defined"],
    ["tp_defined", "Take profit defined"],
    ["rr_meets_minimum", "Reward-to-risk meets minimum"],
    ["risk_within_limits", "Risk within account limits"],
  ] as const;
  const newStates = (analysis?.confirmation_states ?? {}) as Record<string, string | undefined>;
  const hasNewConfirmationModel = Object.keys(newStates).length > 0;
  const newConfirmationsReady = hasNewConfirmationModel &&
    newConfirmationKeys.every(([key]) => newStates[key] === "YES");

  if (hasNewConfirmationModel) {
    for (const [key, label] of newConfirmationKeys) {
      const state = newStates[key];
      checks.push({
        key: `confirm_${key}`,
        label,
        status: state === "YES" ? "PASS" : state === "NO" ? "FAIL" : "NOT_CONFIRMED",
        reason: state === "YES" ? null : state === "NO" ? "Marked as not satisfied" : "Not explicitly confirmed",
        severity: "mandatory",
      });
    }
  } else {
    const legacy = analysis?.setup_confirmation ?? DEFAULT_CONFIRMATION;
    const legacyKeys = [
      ["market_structure_supports", "Market structure supports direction"],
      ["liquidity_met", "Liquidity condition met"],
      ["entry_zone_reached", "Entry zone reached"],
      ["confirmation_candle", "Confirmation candle formed"],
    ] as const;
    for (const [key, label] of legacyKeys) {
      const checked = Boolean(legacy[key]);
      checks.push({
        key: `confirm_${key}`,
        label,
        status: checked ? "PASS" : "NOT_CONFIRMED",
        reason: checked ? null : "Not confirmed by trader",
        severity: "mandatory",
      });
    }
  }

  // Account-specific news restrictions are authoritative.
  const newsBlocked = account?.forbid_high_impact_news === true && analysis?.news_major === true;
  checks.push({
    key: "news_restriction",
    label: "Account news restriction respected",
    status: newsBlocked ? "FAIL" : "PASS",
    reason: newsBlocked ? "This account prohibits trading during the marked high-impact news event" : null,
    severity: "mandatory",
  });

  // The redesigned analysis stores READY in final_decision; older records use status/daily_decision.
  const legacyConfirmationsReady = !hasNewConfirmationModel &&
    Object.values(analysis?.setup_confirmation ?? {}).length > 0 &&
    Object.values(analysis?.setup_confirmation ?? {}).every(Boolean);
  const decisionConfirmed =
    analysis?.final_decision === "READY" ||
    analysis?.status === "SETUP_CONFIRMED" ||
    decision === "CONFIRMED" ||
    newConfirmationsReady ||
    legacyConfirmationsReady;
  checks.push({
    key: "decision_confirmed",
    label: "Daily analysis is confirmed and ready",
    status: decisionConfirmed ? "PASS" : "FAIL",
    reason: decisionConfirmed ? null : "Complete the confirmation checklist and resolve the analysis decision",
    severity: "mandatory",
  });

  // ---- 13. No trade already taken today
  checks.push({
    key: "no_trade_today",
    label: "No trade already taken today",
    status: input.hasTradeToday ? "FAIL" : "PASS",
    reason: input.hasTradeToday ? "A trade is already recorded for today" : null,
    severity: "mandatory",
  });

  // ---- Compute gate status
  const mandatory = checks.filter((c) => c.severity === "mandatory");
  const failed = mandatory.filter((c) => c.status === "FAIL");
  const unconfirmed = mandatory.filter((c) => c.status === "NOT_CONFIRMED");
  const blockers = [...failed, ...unconfirmed]
    .map((c) => c.reason ?? c.label)
    .filter((r): r is string => !!r);

  let status: GateStatus;
  if (!analysis) status = "ANALYSIS_INCOMPLETE";
  else if (input.hasTradeToday || analysis.status === "TRADE_TAKEN") status = "TRADE_TAKEN";
  else if (decision === "NO_TRADE" || analysis.final_decision === "NO_TRADE" || analysis.final_decision === "INVALIDATED" || analysis.status === "NO_TRADE" || analysis.status === "INVALIDATED") status = "INVALIDATED";
  else if (failed.length > 0) status = "BLOCKED";
  else if (unconfirmed.length > 0) status = "WAITING_FOR_CONFIRMATION";
  else if (decision !== "CONFIRMED") status = "WAITING_FOR_SETUP";
  else status = "READY";

  const warnings = checks
    .filter((c) => c.severity === "informational" && c.status !== "PASS")
    .map((c) => c.reason ?? c.label);

  return {
    status,
    checks,
    blockers,
    warnings,
    ready: status === "READY",
  };
}
