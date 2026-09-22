// ALLTRADES — Prop-firm rule engine
// Every function is pure and returns safe values (never NaN/Infinity).

import type { Trade, Account, Withdrawal } from "@/lib/types";
import { parseNumberOrNull, startOfMonth, toDateKey } from "@/lib/utils";

// ---------- Types ----------

export interface SurvivalSnapshot {
  capital: number;
  // Daily
  dailyLossLimit: number;
  dailyLossUsed: number;
  dailyLossRemaining: number;
  dailyUsagePercent: number;
  dailyLevel: "safe" | "approaching" | "breached";
  // Max (trailing)
  maxLossLimit: number;
  maxLossUsed: number;
  maxLossRemaining: number;
  maxUsagePercent: number;
  maxLevel: "safe" | "approaching" | "breached";
  // Personal kill switch
  personalStopAmount: number;
  personalStopUsed: number;
  personalStopRemaining: number;
  personalStopHit: boolean;
  // Trading state
  todayTrades: number;
  todayPnL: number;
  todayTraded: boolean;
  // Overall
  status: "SAFE" | "WARNING" | "DANGER" | "BREACHED";
  headline: string;
}

export interface ProfitSplit {
  grossProfit: number;
  splitPercent: number;
  traderShare: number;
  firmShare: number;
  alreadyWithdrawn: number;
  availablePayout: number;
}

export interface PayoutEligibility {
  tradingDaysThisMonth: number;
  requiredTradingDays: number;
  daysRemaining: number;
  eligibleByDays: boolean;
  eligibleByProfit: boolean;
  eligibleByConsistency: boolean;
  eligibleOverall: boolean;
  expectedTraderShare: number;
  payoutEstimateDate: string;
}

export interface Mistake {
  code: string;
  severity: "info" | "warn" | "violation";
  message: string;
  tradeId?: string;
}

export interface PerformanceScore {
  total: number;
  breakdown: {
    key: string;
    label: string;
    score: number;
    max: number;
    hint: string;
  }[];
}

// ---------- Helpers ----------

function maxLossPercent(account: Account): number {
  return Number(account.max_total_drawdown_percent) || 3;
}
function dailyLossPercent(account: Account): number {
  return Number(account.max_daily_drawdown_percent) || 2;
}
function profitSplit(account: Account): number {
  return Number((account as unknown as { profit_split_percent?: number }).profit_split_percent) || 80;
}
function personalStopPercent(account: Account): number {
  return Number((account as unknown as { personal_daily_stop_percent?: number }).personal_daily_stop_percent) || 0.5;
}
function payoutMinDays(account: Account): number {
  return Number((account as unknown as { payout_min_trading_days?: number }).payout_min_trading_days) || 7;
}

// ---------- Survival snapshot ----------

export function computeSurvival(
  account: Account | null,
  trades: Trade[],
  withdrawals: Withdrawal[]
): SurvivalSnapshot {
  const empty: SurvivalSnapshot = {
    capital: 0,
    dailyLossLimit: 0,
    dailyLossUsed: 0,
    dailyLossRemaining: 0,
    dailyUsagePercent: 0,
    dailyLevel: "safe",
    maxLossLimit: 0,
    maxLossUsed: 0,
    maxLossRemaining: 0,
    maxUsagePercent: 0,
    maxLevel: "safe",
    personalStopAmount: 0,
    personalStopUsed: 0,
    personalStopRemaining: 0,
    personalStopHit: false,
    todayTrades: 0,
    todayPnL: 0,
    todayTraded: false,
    status: "SAFE",
    headline: "Protect the account first. Profit second.",
  };

  if (!account) return empty;

  const startCap = Number(account.starting_capital) || 0;
  const totalPnL = trades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const totalWithdrawn = withdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const capital = startCap + totalPnL - totalWithdrawn;

  // Daily
  const todayKey = toDateKey(new Date());
  const todayTrades = trades.filter((t) => t.trade_date === todayKey);
  const todayPnL = todayTrades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);

  const dailyLimitPct = dailyLossPercent(account);
  const dailyLossLimit = (startCap * dailyLimitPct) / 100;
  const dailyLossUsed = Math.max(-todayPnL, 0);
  const dailyLossRemaining = Math.max(dailyLossLimit - dailyLossUsed, 0);
  const dailyUsagePercent =
    dailyLossLimit > 0 ? Math.min(100, (dailyLossUsed / dailyLossLimit) * 100) : 0;
  const dailyLevel: SurvivalSnapshot["dailyLevel"] =
    dailyUsagePercent >= 100 ? "breached" : dailyUsagePercent >= 70 ? "approaching" : "safe";

  // Trailing max loss: measured from highest watermark of running balance
  const sorted = [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  let running = startCap;
  let watermark = startCap;
  for (const t of sorted) {
    running += Number(t.profit_loss) || 0;
    if (running > watermark) watermark = running;
  }
  if (capital > watermark) watermark = capital;

  const maxLimitPct = maxLossPercent(account);
  const maxLossLimit = (watermark * maxLimitPct) / 100;
  const maxLossUsed = Math.max(watermark - capital, 0);
  const maxLossRemaining = Math.max(maxLossLimit - maxLossUsed, 0);
  const maxUsagePercent =
    maxLossLimit > 0 ? Math.min(100, (maxLossUsed / maxLossLimit) * 100) : 0;
  const maxLevel: SurvivalSnapshot["maxLevel"] =
    maxUsagePercent >= 100 ? "breached" : maxUsagePercent >= 70 ? "approaching" : "safe";

  // Personal stop
  const personalStopPct = personalStopPercent(account);
  const personalStopAmount = (startCap * personalStopPct) / 100;
  const personalStopUsed = dailyLossUsed;
  const personalStopRemaining = Math.max(personalStopAmount - personalStopUsed, 0);
  const personalStopHit = personalStopUsed >= personalStopAmount;

  // Overall
  let status: SurvivalSnapshot["status"] = "SAFE";
  if (dailyLevel === "breached" || maxLevel === "breached") status = "BREACHED";
  else if (dailyLevel === "approaching" || maxLevel === "approaching") status = "WARNING";
  else if (personalStopHit) status = "DANGER";

  let headline = "Protect the account first. Profit second.";
  if (status === "BREACHED") headline = "Account breached — stop trading immediately.";
  else if (status === "DANGER") headline = "Personal stop hit — no more trades today.";
  else if (status === "WARNING") headline = "Approaching a limit — manage risk tightly.";

  return {
    capital,
    dailyLossLimit,
    dailyLossUsed,
    dailyLossRemaining,
    dailyUsagePercent,
    dailyLevel,
    maxLossLimit,
    maxLossUsed,
    maxLossRemaining,
    maxUsagePercent,
    maxLevel,
    personalStopAmount,
    personalStopUsed,
    personalStopRemaining,
    personalStopHit,
    todayTrades: todayTrades.length,
    todayPnL,
    todayTraded: todayTrades.length > 0,
    status,
    headline,
  };
}

// ---------- Profit split ----------

export function computeProfitSplit(
  account: Account | null,
  trades: Trade[],
  withdrawals: Withdrawal[]
): ProfitSplit {
  const split = account ? profitSplit(account) : 80;
  const grossProfit = trades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const positive = Math.max(grossProfit, 0);
  const traderShare = (positive * split) / 100;
  const firmShare = positive - traderShare;
  const alreadyWithdrawn = withdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0);
  const availablePayout = Math.max(traderShare - alreadyWithdrawn, 0);
  return {
    grossProfit: positive,
    splitPercent: split,
    traderShare,
    firmShare,
    alreadyWithdrawn,
    availablePayout,
  };
}

// ---------- Payout countdown ----------

export function computePayoutEligibility(
  account: Account | null,
  trades: Trade[],
  withdrawals: Withdrawal[],
  referenceDate: Date = new Date()
): PayoutEligibility {
  if (!account) {
    return {
      tradingDaysThisMonth: 0,
      requiredTradingDays: 7,
      daysRemaining: 7,
      eligibleByDays: false,
      eligibleByProfit: false,
      eligibleByConsistency: false,
      eligibleOverall: false,
      expectedTraderShare: 0,
      payoutEstimateDate: "—",
    };
  }

  const minDays = payoutMinDays(account);
  const monthStart = startOfMonth(referenceDate);

  const monthTrades = trades.filter((t) => {
    const d = new Date(t.trade_date + "T00:00:00");
    return d >= monthStart;
  });

  const tradingDays = new Set(monthTrades.map((t) => t.trade_date));
  const tradingDaysCount = tradingDays.size;
  const daysRemaining = Math.max(minDays - tradingDaysCount, 0);
  const eligibleByDays = tradingDaysCount >= minDays;

  const grossProfit = monthTrades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const targetPct = Number(account.withdrawal_target_percent) || 4;
  const target = (Number(account.starting_capital) || 0) * (targetPct / 100);
  const eligibleByProfit = grossProfit >= target;

  // Consistency
  const daily = new Map<string, number>();
  for (const t of monthTrades) {
    daily.set(t.trade_date, (daily.get(t.trade_date) ?? 0) + (Number(t.profit_loss) || 0));
  }
  const days = Array.from(daily.values());
  const totalProfit = days.reduce((s, v) => s + Math.max(v, 0), 0);
  const biggestDay = days.reduce((s, v) => Math.max(s, v), 0);
  const consistencyScore = totalProfit > 0 ? (biggestDay / totalProfit) * 100 : 0;
  const maxConsistency = Number(account.max_consistency_percent) || 20;
  const eligibleByConsistency = consistencyScore <= maxConsistency;

  const split = computeProfitSplit(account, trades, withdrawals);

  // Estimate payout date = today + daysRemaining (business-ish, simple weekday skip)
  const estimate = new Date(referenceDate);
  let toAdd = daysRemaining;
  while (toAdd > 0) {
    estimate.setDate(estimate.getDate() + 1);
    const dow = estimate.getDay();
    if (dow !== 0 && dow !== 6) toAdd--;
  }

  return {
    tradingDaysThisMonth: tradingDaysCount,
    requiredTradingDays: minDays,
    daysRemaining,
    eligibleByDays,
    eligibleByProfit,
    eligibleByConsistency,
    eligibleOverall: eligibleByDays && eligibleByProfit && eligibleByConsistency,
    expectedTraderShare: split.traderShare,
    payoutEstimateDate: estimate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

// ---------- Mistake detection ----------

export function detectMistakes(
  account: Account | null,
  trades: Trade[]
): Mistake[] {
  if (!account) return [];

  const mistakes: Mistake[] = [];
  const allowedInstrument =
    (account as unknown as { allowed_instrument?: string }).allowed_instrument ?? null;
  const minRR = Number((account as unknown as { min_rr?: number }).min_rr ?? 2);
  const minSL = Number((account as unknown as { min_sl_pips?: number }).min_sl_pips ?? 10);
  const maxSL = Number((account as unknown as { max_sl_pips?: number }).max_sl_pips ?? 15);
  const personalStopPct = personalStopPercent(account);
  const startCap = Number(account.starting_capital) || 0;
  const maxRisk = (startCap * personalStopPct) / 100;

  const byDate = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byDate.get(t.trade_date) ?? [];
    list.push(t);
    byDate.set(t.trade_date, list);
  }

  for (const t of trades) {
    // Instrument
    if (allowedInstrument && t.instrument !== allowedInstrument) {
      mistakes.push({
        code: "instrument_off_plan",
        severity: "violation",
        message: `${t.instrument} trade — only ${allowedInstrument} allowed.`,
        tradeId: t.id,
      });
    }

    // Risk exceeded
    const risk = parseNumberOrNull(t.risk_amount);
    if (risk !== null && risk > maxRisk + 0.01) {
      const pct = startCap > 0 ? (risk / startCap) * 100 : 0;
      mistakes.push({
        code: "risk_exceeded",
        severity: "violation",
        message: `Risk was ${pct.toFixed(2)}% — planned ${personalStopPct.toFixed(2)}%.`,
        tradeId: t.id,
      });
    }

    // SL overshoot
    const sl = parseNumberOrNull(t.stop_loss);
    if (sl !== null) {
      const pl = Number(t.profit_loss) || 0;
      if (risk !== null && risk > 0 && pl < -1.5 * risk) {
        mistakes.push({
          code: "sl_overshoot",
          severity: "violation",
          message: `Loss exceeded 1.5x risk — SL likely moved or ignored.`,
          tradeId: t.id,
        });
      }
    }

    // SL pips range
    const pips = parseNumberOrNull(t.pips);
    if (pips !== null && pips !== 0) {
      const abs = Math.abs(pips);
      if (abs < minSL) {
        mistakes.push({
          code: "sl_too_tight",
          severity: "warn",
          message: `SL was ${abs} pips — below minimum ${minSL}.`,
          tradeId: t.id,
        });
      } else if (abs > maxSL) {
        mistakes.push({
          code: "sl_too_wide",
          severity: "warn",
          message: `SL was ${abs} pips — above maximum ${maxSL}.`,
          tradeId: t.id,
        });
      }
    }

    // RR below minimum
    const rr = parseNumberOrNull(t.risk_reward?.split(":")[1]) ?? null;
    if (rr !== null && rr < minRR) {
      mistakes.push({
        code: "rr_below_min",
        severity: "violation",
        message: `Planned RR 1:${rr} — below minimum 1:${minRR}.`,
        tradeId: t.id,
      });
    }

    // News trade
    const news = (t.news_event ?? "").toLowerCase();
    if (
      news.includes("high impact") ||
      news === "cpi" ||
      news === "nfp" ||
      news === "fomc" ||
      news.includes("interest rate")
    ) {
      mistakes.push({
        code: "news_trade",
        severity: "violation",
        message: `Traded during ${t.news_event}.`,
        tradeId: t.id,
      });
    }
  }

  // More than one trade per day + revenge trade
  for (const [, list] of byDate) {
    if (list.length > 1) {
      for (let i = 1; i < list.length; i++) {
        mistakes.push({
          code: "multi_trade_day",
          severity: "violation",
          message: `${list.length} trades on ${list[0].trade_date}.`,
          tradeId: list[i].id,
        });
        if (list[i - 1].result === "Loss") {
          mistakes.push({
            code: "revenge_trade",
            severity: "violation",
            message: `Trade taken right after a loss on ${list[0].trade_date}.`,
            tradeId: list[i].id,
          });
        }
      }
    }
  }

  return mistakes;
}

// ---------- Trader performance score ----------

export function computePerformanceScore(
  account: Account | null,
  trades: Trade[],
  mistakes: Mistake[]
): PerformanceScore {
  if (!account || trades.length === 0) {
    return {
      total: 0,
      breakdown: [],
    };
  }

  const startCap = Number(account.starting_capital) || 0;
  const maxRisk = (startCap * personalStopPercent(account)) / 100;

  // 1. Risk compliance (0–20)
  const riskyTrades = trades.filter((t) => {
    const r = parseNumberOrNull(t.risk_amount);
    return r !== null && r > maxRisk + 0.01;
  });
  const riskScore = Math.max(0, 20 - riskyTrades.length * 4);

  // 2. Rule compliance (0–20)
  const violationCount = mistakes.filter((m) => m.severity === "violation").length;
  const ruleScore = Math.max(0, 20 - violationCount * 2);

  // 3. Setup quality (0–15) — % of trades with strategy + setup_type + session
  const complete = trades.filter(
    (t) => t.strategy && t.setup_type && t.session
  ).length;
  const setupScore = trades.length > 0 ? (complete / trades.length) * 15 : 0;

  // 4. RR compliance (0–15) — % of trades with planned RR ≥ min
  const minRR = Number((account as unknown as { min_rr?: number }).min_rr ?? 2);
  const goodRR = trades.filter((t) => {
    const parts = (t.risk_reward ?? "").split(":");
    const val = parseNumberOrNull(parts[1] ?? null);
    return val !== null && val >= minRR;
  }).length;
  const rrScore = trades.length > 0 ? (goodRR / trades.length) * 15 : 0;

  // 5. Trade frequency (0–10) — penalize multi-trade days
  const multiDays = Array.from(
    new Set(
      mistakes.filter((m) => m.code === "multi_trade_day").map((m) => m.message)
    )
  ).length;
  const freqScore = Math.max(0, 10 - multiDays * 2);

  // 6. Journal completeness (0–10) — % of trades with entry_reason, exit_reason, screenshots
  const journalComplete = trades.filter(
    (t) => t.entry_reason && t.exit_reason
  ).length;
  const journalScore = trades.length > 0 ? (journalComplete / trades.length) * 10 : 0;

  // 7. Emotional control (0–5) — penalty for emotional notes
  const emotional = trades.filter((t) => {
    const e = (t.emotions ?? "").toLowerCase();
    return e.includes("fomo") || e.includes("revenge") || e.includes("greed") || e.includes("fear");
  }).length;
  const emotionScore = Math.max(0, 5 - emotional);

  // 8. No revenge trading (0–5) — hard binary
  const revengeCount = mistakes.filter((m) => m.code === "revenge_trade").length;
  const revengeScore = revengeCount === 0 ? 5 : 0;

  const breakdown = [
    { key: "risk", label: "Risk compliance", score: riskScore, max: 20, hint: `${riskyTrades.length} risky trade(s)` },
    { key: "rules", label: "Rule compliance", score: ruleScore, max: 20, hint: `${violationCount} violation(s)` },
    { key: "setup", label: "Setup quality", score: setupScore, max: 15, hint: `${complete}/${trades.length} complete` },
    { key: "rr", label: "RR compliance", score: rrScore, max: 15, hint: `${goodRR}/${trades.length} ≥ 1:${minRR}` },
    { key: "frequency", label: "Trade frequency", score: freqScore, max: 10, hint: `${multiDays} multi-trade day(s)` },
    { key: "journal", label: "Journal completeness", score: journalScore, max: 10, hint: `${journalComplete}/${trades.length} full` },
    { key: "emotions", label: "Emotional control", score: emotionScore, max: 5, hint: `${emotional} flagged` },
    { key: "revenge", label: "No revenge trading", score: revengeScore, max: 5, hint: revengeCount === 0 ? "Clean" : `${revengeCount} event(s)` },
  ];

  const total = breakdown.reduce((s, b) => s + b.score, 0);

  return { total: Math.round(total), breakdown };
}
