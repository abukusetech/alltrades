// ALLTRADES — Maven Instant Funding rule engine
//
// All eight published rules are calculated here. Pure functions only —
// no Supabase, no side effects. Every calculation is defensive against
// missing data and returns null where a value can't be computed.

import type { Account, Trade, MavenRuleVersion } from "@/lib/types";

// ---------- Inputs ----------

export interface MavenAccountState {
  startingBalance: number;
  dailyReferenceBalance: number;      // balance at 00:00 UTC
  dailyReferenceSetAt: string | null;
  highestEquityWatermark: number;     // running equity high
  currentBalance: number;
  currentEquity: number | null;       // may differ from balance when positions open
}

// ---------- Rule 1: Daily drawdown 2% ----------

export interface DailyDrawdownStatus {
  referenceValue: number;
  allowanceAmount: number;
  breachThreshold: number;
  currentEquity: number;
  usedAmount: number;           // how much has been lost today
  remainingAmount: number;
  percentUsed: number;          // 0-100+
  breached: boolean;
  status: "safe" | "approaching" | "breached";
}

export function computeDailyDrawdown(
  state: MavenAccountState,
  rules: MavenRuleVersion
): DailyDrawdownStatus {
  const pct = Number(rules.rules.daily_drawdown_percent) || 2;
  const ref = state.dailyReferenceBalance;
  const allowanceAmount = (ref * pct) / 100;
  const breachThreshold = ref - allowanceAmount;
  const currentEquity = state.currentEquity ?? state.currentBalance;
  const usedAmount = Math.max(ref - currentEquity, 0);
  const remainingAmount = Math.max(allowanceAmount - usedAmount, 0);
  const percentUsed = allowanceAmount > 0
    ? Math.min(100, (usedAmount / allowanceAmount) * 100)
    : 0;

  const breached = currentEquity <= breachThreshold;
  const status: DailyDrawdownStatus["status"] = breached
    ? "breached"
    : percentUsed >= 70
      ? "approaching"
      : "safe";

  return {
    referenceValue: ref,
    allowanceAmount,
    breachThreshold,
    currentEquity,
    usedAmount,
    remainingAmount,
    percentUsed,
    breached,
    status,
  };
}

// ---------- Rule 2: Maximum trailing drawdown 3% ----------

export interface TrailingDrawdownStatus {
  watermark: number;
  allowanceAmount: number;
  breachThreshold: number;
  currentEquity: number;
  usedAmount: number;
  remainingAmount: number;
  percentUsed: number;
  breached: boolean;
  status: "safe" | "approaching" | "breached";
}

export function computeTrailingDrawdown(
  state: MavenAccountState,
  rules: MavenRuleVersion
): TrailingDrawdownStatus {
  const pct = Number(rules.rules.max_trailing_drawdown_percent) || 3;
  const watermark = Math.max(
    state.highestEquityWatermark,
    state.currentEquity ?? state.currentBalance
  );
  const allowanceAmount = (watermark * pct) / 100;
  const breachThreshold = watermark - allowanceAmount;
  const currentEquity = state.currentEquity ?? state.currentBalance;
  const usedAmount = Math.max(watermark - currentEquity, 0);
  const remainingAmount = Math.max(allowanceAmount - usedAmount, 0);
  const percentUsed = allowanceAmount > 0
    ? Math.min(100, (usedAmount / allowanceAmount) * 100)
    : 0;

  const breached = currentEquity <= breachThreshold;
  const status: TrailingDrawdownStatus["status"] = breached
    ? "breached"
    : percentUsed >= 70
      ? "approaching"
      : "safe";

  return {
    watermark,
    allowanceAmount,
    breachThreshold,
    currentEquity,
    usedAmount,
    remainingAmount,
    percentUsed,
    breached,
    status,
  };
}

// ---------- Rule 3: Maximum floating loss 1% ----------

export interface FloatingLossStatus {
  allowanceAmount: number;
  currentFloatingLoss: number;    // balance - equity
  remainingAmount: number;
  percentUsed: number;
  breached: boolean;
  status: "safe" | "approaching" | "breached";
  hasOpenPositions: boolean;
}

export function computeFloatingLoss(
  state: MavenAccountState,
  rules: MavenRuleVersion
): FloatingLossStatus {
  const pct = Number(rules.rules.max_floating_loss_percent) || 1;
  const balance = state.currentBalance;
  const equity = state.currentEquity;
  const allowanceAmount = (balance * pct) / 100;

  // Floating loss = balance - equity when equity < balance; 0 otherwise
  const currentFloatingLoss =
    equity !== null ? Math.max(balance - equity, 0) : 0;

  const remainingAmount = Math.max(allowanceAmount - currentFloatingLoss, 0);
  const percentUsed = allowanceAmount > 0
    ? Math.min(100, (currentFloatingLoss / allowanceAmount) * 100)
    : 0;

  const breached = currentFloatingLoss > allowanceAmount;
  const status: FloatingLossStatus["status"] = breached
    ? "breached"
    : percentUsed >= 70
      ? "approaching"
      : "safe";

  return {
    allowanceAmount,
    currentFloatingLoss,
    remainingAmount,
    percentUsed,
    breached,
    status,
    hasOpenPositions: equity !== null && equity !== balance,
  };
}

// ---------- Rule 4: Maximum risk per trade 1% ----------

export interface RiskPerTradeCheck {
  allowedAmount: number;
  plannedRiskAmount: number;
  percent: number;
  withinLimit: boolean;
  warning: string | null;
}

export function checkRiskPerTrade(
  state: MavenAccountState,
  rules: MavenRuleVersion,
  plannedRiskAmount: number
): RiskPerTradeCheck {
  const pct = Number(rules.rules.max_risk_per_trade_percent) || 1;
  const allowedAmount = (state.currentBalance * pct) / 100;
  const actualPercent =
    state.currentBalance > 0
      ? (plannedRiskAmount / state.currentBalance) * 100
      : 0;

  const withinLimit = plannedRiskAmount <= allowedAmount + 0.01;

  return {
    allowedAmount,
    plannedRiskAmount,
    percent: actualPercent,
    withinLimit,
    warning: withinLimit
      ? null
      : `Planned risk $${plannedRiskAmount.toFixed(2)} (${actualPercent.toFixed(2)}%) exceeds Maven's ${pct}% limit of $${allowedAmount.toFixed(2)}.`,
  };
}

// ---------- Rule 5: Minimum payout profit 3% ----------

export interface PayoutProfitProgress {
  startingBalance: number;
  requiredProfit: number;
  currentProfit: number;
  percentAchieved: number;
  remaining: number;
  met: boolean;
}

export function computePayoutProfitProgress(
  state: MavenAccountState,
  rules: MavenRuleVersion
): PayoutProfitProgress {
  const pct = Number(rules.rules.min_payout_profit_percent) || 3;
  const requiredProfit = (state.startingBalance * pct) / 100;
  const currentProfit = Math.max(
    (state.currentEquity ?? state.currentBalance) - state.startingBalance,
    0
  );
  const percentAchieved = requiredProfit > 0
    ? Math.min(100, (currentProfit / requiredProfit) * 100)
    : 0;
  const remaining = Math.max(requiredProfit - currentProfit, 0);

  return {
    startingBalance: state.startingBalance,
    requiredProfit,
    currentProfit,
    percentAchieved,
    remaining,
    met: currentProfit >= requiredProfit,
  };
}

// ---------- Rule 6: Consistency 20% ----------

export interface ConsistencyStatus {
  biggestWinningDay: number;
  totalQualifyingProfit: number;
  score: number;                // percentage
  maxAllowed: number;
  met: boolean;
  // When the user is over the limit, how much more profit is needed to
  // bring the ratio back down.
  requiredExtraProfit: number | null;
  status: "safe" | "approaching" | "over";
}

/**
 * Consistency = biggest winning day ÷ total qualifying profit × 100.
 * Uses daily realized P/L, not individual trades.
 * Safe against zero/negative profit.
 */
export function computeConsistency(
  trades: Trade[],
  rules: MavenRuleVersion
): ConsistencyStatus {
  const maxAllowed = Number(rules.rules.consistency_max_percent) || 20;

  // Group trades by day
  const dailyMap = new Map<string, number>();
  for (const t of trades) {
    dailyMap.set(
      t.trade_date,
      (dailyMap.get(t.trade_date) ?? 0) + Number(t.profit_loss || 0)
    );
  }

  let biggestWinningDay = 0;
  let totalQualifyingProfit = 0;
  for (const dayPnl of dailyMap.values()) {
    if (dayPnl > 0) {
      totalQualifyingProfit += dayPnl;
      if (dayPnl > biggestWinningDay) biggestWinningDay = dayPnl;
    }
  }

  let score = 0;
  if (totalQualifyingProfit > 0 && biggestWinningDay > 0) {
    const raw = (biggestWinningDay / totalQualifyingProfit) * 100;
    score = Number.isFinite(raw) ? raw : 0;
  }

  const met = score <= maxAllowed;
  const status: ConsistencyStatus["status"] = met
    ? score > maxAllowed * 0.8
      ? "approaching"
      : "safe"
    : "over";

  // How much more profit to bring the score back to the limit:
  // needed = (biggestWinningDay / maxAllowed) * 100 - totalProfit
  let requiredExtraProfit: number | null = null;
  if (!met && maxAllowed > 0 && biggestWinningDay > 0) {
    const needed = (biggestWinningDay / (maxAllowed / 100)) - totalQualifyingProfit;
    if (Number.isFinite(needed) && needed > 0) {
      requiredExtraProfit = needed;
    }
  }

  return {
    biggestWinningDay,
    totalQualifyingProfit,
    score,
    maxAllowed,
    met,
    requiredExtraProfit,
    status,
  };
}

// ---------- Rule 7: Profit split 80/20 ----------

export interface ProfitSplitResult {
  grossProfit: number;
  traderPercent: number;
  firmPercent: number;
  traderShare: number;
  firmShare: number;
  feesApplied: number;
  netTraderPayout: number;
}

export function computeProfitSplit(
  grossProfit: number,
  rules: MavenRuleVersion,
  fees = 0
): ProfitSplitResult {
  const traderPercent = Number(rules.rules.trader_profit_share_percent) || 80;
  const firmPercent = Number(rules.rules.firm_profit_share_percent) || 20;
  const traderShare = (grossProfit * traderPercent) / 100;
  const firmShare = (grossProfit * firmPercent) / 100;
  const netTraderPayout = Math.max(traderShare - fees, 0);

  return {
    grossProfit,
    traderPercent,
    firmPercent,
    traderShare,
    firmShare,
    feesApplied: fees,
    netTraderPayout,
  };
}

// ---------- Rule 8: Rolling 30-day withdrawal cap ----------

export interface WithdrawalCapStatus {
  cap: number;
  usedInLast30Days: number;
  remaining: number;
  percentUsed: number;
}

export function computeWithdrawalCap(
  paidWithdrawals: { received_date: string | null; actual_net_received: number | null }[],
  rules: MavenRuleVersion,
  referenceDate = new Date()
): WithdrawalCapStatus {
  const cap = Number(rules.rules.max_withdrawal_per_30d) || 10000;
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const usedInLast30Days = paidWithdrawals
    .filter((w) => w.received_date && w.received_date >= cutoff)
    .reduce((s, w) => s + Number(w.actual_net_received ?? 0), 0);

  const remaining = Math.max(cap - usedInLast30Days, 0);
  const percentUsed = cap > 0
    ? Math.min(100, (usedInLast30Days / cap) * 100)
    : 0;

  return { cap, usedInLast30Days, remaining, percentUsed };
}

// ---------- Composite: full payout readiness ----------

export interface PayoutReadiness {
  profitMet: boolean;
  consistencyMet: boolean;
  kycVerified: boolean;
  withdrawalCapOk: boolean;
  ready: boolean;
  blockers: string[];
}

export function computePayoutReadiness(
  profitProgress: PayoutProfitProgress,
  consistency: ConsistencyStatus,
  kycStatus: string,
  withdrawalCap: WithdrawalCapStatus
): PayoutReadiness {
  const profitMet = profitProgress.met;
  const consistencyMet = consistency.met;
  const kycVerified = kycStatus === "Verified";
  const withdrawalCapOk = withdrawalCap.remaining > 0;

  const blockers: string[] = [];
  if (!profitMet) {
    blockers.push(
      `Need $${profitProgress.remaining.toFixed(2)} more profit to reach the ${profitProgress.requiredProfit.toFixed(2)} minimum.`
    );
  }
  if (!consistencyMet) {
    blockers.push(
      `Consistency score is ${consistency.score.toFixed(1)}% — must be ${consistency.maxAllowed}% or lower.`
    );
  }
  if (!kycVerified) {
    blockers.push(
      kycStatus === "Not started"
        ? "KYC verification required."
        : `KYC status: ${kycStatus}.`
    );
  }
  if (!withdrawalCapOk) {
    blockers.push(
      `30-day withdrawal cap of $${withdrawalCap.cap.toFixed(2)} reached.`
    );
  }

  return {
    profitMet,
    consistencyMet,
    kycVerified,
    withdrawalCapOk,
    ready: blockers.length === 0,
    blockers,
  };
}

// ---------- Rule 8b: Rolling 30-day withdrawal cap (alternative name) ----------
// (already defined above as computeWithdrawalCap)

// ---------- Rule 9: Inactivity and prohibited behaviour warnings ----------

export interface BehaviorWarning {
  key: string;
  message: string;
  severity: "info" | "warn" | "violation";
}

export function detectMavenBehaviorWarnings(
  trades: Trade[],
  rules: MavenRuleVersion,
  now = new Date()
): BehaviorWarning[] {
  const warnings: BehaviorWarning[] = [];
  if (trades.length === 0) return warnings;

  // 1. Inactivity — last trade more than N days ago
  const inactivityDays = Number(rules.rules.inactivity_warning_days) || 30;
  const latest = trades
    .map((t) => t.trade_date)
    .sort()
    .reverse()[0];
  if (latest) {
    const daysSince = Math.floor(
      (now.getTime() - new Date(latest + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSince >= inactivityDays) {
      warnings.push({
        key: "inactivity",
        message: `No trades recorded for ${daysSince} days. Maven considers long inactivity — verify your program's inactivity rule.`,
        severity: "warn",
      });
    }
  }

  // 2. Excessive scalping — % of trades held under threshold seconds
  const thresholdSeconds = Number(rules.rules.excessive_scalping_threshold_seconds) || 60;
  const thresholdPercent = Number(rules.rules.excessive_scalping_percent) || 50;
  let scalpedCount = 0;
  for (const t of trades) {
    const secs = parseHoldingSeconds(t.holding_time);
    if (secs !== null && secs < thresholdSeconds) scalpedCount++;
  }
  if (trades.length > 0) {
    const pct = (scalpedCount / trades.length) * 100;
    if (pct >= thresholdPercent) {
      warnings.push({
        key: "scalping",
        message: `${pct.toFixed(0)}% of trades held under ${thresholdSeconds}s — Maven's excessive-scalping threshold may apply. This is a local warning only.`,
        severity: "warn",
      });
    }
  }

  return warnings;
}

function parseHoldingSeconds(holding: string | null): number | null {
  if (!holding) return null;
  const s = holding.toLowerCase().trim();
  const m = s.match(/^(\d+)\s*(s|sec|secs|seconds?|m|min|mins|minutes?|h|hr|hrs|hours?)$/);
  if (!m) {
    // Try "2h 15m" style
    const parts = s.matchAll(/(\d+)\s*(s|m|h)/g);
    let total = 0;
    let matched = false;
    for (const p of parts) {
      matched = true;
      const v = Number(p[1]);
      if (p[2] === "s") total += v;
      else if (p[2] === "m") total += v * 60;
      else if (p[2] === "h") total += v * 3600;
    }
    return matched ? total : null;
  }
  const v = Number(m[1]);
  if (m[2].startsWith("s")) return v;
  if (m[2].startsWith("m")) return v * 60;
  if (m[2].startsWith("h")) return v * 3600;
  return null;
}
