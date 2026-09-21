// ============================================================
// ALLTRADES — Calculation engine
// Pure functions. No Supabase, no side effects.
// Every numeric return value is safe (never NaN / Infinity).
// ============================================================

import type { Trade, Withdrawal, Account } from "./types";
import { startOfWeek, endOfWeek, toDateKey } from "./utils";

// ---------- Types ----------

export interface DailyPnL {
  date: string; // YYYY-MM-DD
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
}

export interface DrawdownStatus {
  /** Highest balance watermark recorded (starting capital or higher). */
  highestWatermark: number;
  /** Absolute currency value of the trailing 3% drawdown floor. */
  trailingFloorAmount: number;
  /** Account value below which the trailing rule is breached. */
  trailingFloor: number;
  /** True when current capital <= trailingFloor. */
  trailingBreached: boolean;
  /** Current capital minus trailing floor (positive = safe room). */
  trailingRemaining: number;
  /** Percentage used of the trailing drawdown budget (0-100+). */
  trailingUsagePercent: number;

  /** Daily 2% limit expressed in dollars. */
  dailyFloorAmount: number;
  /** The daily floor value relative to today's starting balance. */
  dailyFloor: number;
  /** Today's P/L (0 if no trades today). */
  todayPnL: number;
  /** Daily budget remaining (floor - today's cumulative loss). Negative = breached. */
  dailyRemaining: number;
  /** Percentage used of the daily drawdown budget. */
  dailyUsagePercent: number;
  dailyBreached: boolean;
}

export interface AccountMetrics {
  // Capital
  startingCapital: number;
  currentCapital: number;
  totalWithdrawn: number;

  // Performance
  totalPnL: number;
  totalProfit: number; // sum of positive daily P/L only
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number | null;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  averagePnL: number | null;

  // Day-level
  biggestWinningDay: number;
  biggestLosingDay: number;
  tradingDays: number;

  // Consistency
  consistencyScore: number; // 0-100, safe
  requiredTotalProfit: number; // biggestWinningDay * 5
  consistencyStatus: "safe" | "approaching" | "over";
  maxConsistencyPercent: number;

  // Withdrawals
  withdrawalTarget: number;
  profitTowardTarget: number;
  amountRemaining: number;
  targetReached: boolean;
  withdrawalEligible: boolean;
  withdrawalBlockReason:
    | "TARGET_NOT_REACHED"
    | "CONSISTENCY_ABOVE_LIMIT"
    | "NO_ACCOUNT"
    | null;

  // Weekly discipline
  weeklyTradeCount: number;
  maxWeeklyTrades: number;
  weeklyRemaining: number;
  weeklyLimitReached: boolean;

  // Per-day breakdown
  dailyPnL: DailyPnL[];
  dailyMap: Map<string, DailyPnL>;
}

// ---------- Core calculations ----------

export function buildDailyMap(trades: Trade[]): Map<string, DailyPnL> {
  const map = new Map<string, DailyPnL>();
  for (const t of trades) {
    const key = t.trade_date;
    const existing = map.get(key) ?? {
      date: key,
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
    };
    const pl = Number(t.profit_loss) || 0;
    existing.pnl += pl;
    existing.trades += 1;
    if (t.result === "Win") existing.wins += 1;
    else if (t.result === "Loss") existing.losses += 1;
    else existing.breakeven += 1;
    map.set(key, existing);
  }
  return map;
}

export function computeAccountMetrics(
  account: Account | null,
  trades: Trade[],
  withdrawals: Withdrawal[],
  referenceDate: Date = new Date()
): AccountMetrics {
  const empty = emptyMetrics(account);
  if (!account) return empty;

  const startCap = Number(account.starting_capital) || 0;
  const totalWithdrawn = withdrawals.reduce(
    (s, w) => s + (Number(w.amount) || 0),
    0
  );

  const totalPnL = trades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const currentCapital = startCap + totalPnL - totalWithdrawn;

  const winningTrades = trades.filter((t) => t.result === "Win").length;
  const losingTrades = trades.filter((t) => t.result === "Loss").length;
  const breakevenTrades = trades.filter((t) => t.result === "Breakeven").length;
  const totalTrades = trades.length;

  const grossProfit = trades
    .filter((t) => (Number(t.profit_loss) || 0) > 0)
    .reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const grossLoss = Math.abs(
    trades
      .filter((t) => (Number(t.profit_loss) || 0) < 0)
      .reduce((s, t) => s + (Number(t.profit_loss) || 0), 0)
  );

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const averagePnL = totalTrades > 0 ? totalPnL / totalTrades : null;

  // Daily breakdown
  const dailyMap = buildDailyMap(trades);
  const dailyPnL = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  let biggestWinningDay = 0;
  let biggestLosingDay = 0;
  for (const d of dailyPnL) {
    if (d.pnl > biggestWinningDay) biggestWinningDay = d.pnl;
    if (d.pnl < biggestLosingDay) biggestLosingDay = d.pnl;
  }

  // Consistency: biggest winning day / total profit * 100
  const totalProfit = dailyPnL.reduce((s, d) => s + Math.max(d.pnl, 0), 0);
  let consistencyScore = 0;
  if (totalProfit > 0 && biggestWinningDay > 0) {
    const raw = (biggestWinningDay / totalProfit) * 100;
    consistencyScore = Number.isFinite(raw) ? raw : 0;
  }

  const requiredTotalProfit =
    biggestWinningDay > 0 ? biggestWinningDay * 5 : 0;

  const maxConsistencyPercent = Number(account.max_consistency_percent) || 20;
  let consistencyStatus: AccountMetrics["consistencyStatus"] = "safe";
  if (consistencyScore > maxConsistencyPercent) consistencyStatus = "over";
  else if (consistencyScore > maxConsistencyPercent * 0.8)
    consistencyStatus = "approaching";

  // Withdrawal target
  const withdrawalTargetPercent =
    Number(account.withdrawal_target_percent) || 4;
  const withdrawalTarget = startCap * (withdrawalTargetPercent / 100);
  const profitTowardTarget = Math.max(totalPnL, 0);
  const amountRemaining = Math.max(withdrawalTarget - profitTowardTarget, 0);
  const targetReached = totalPnL >= withdrawalTarget;

  const consistencyOk = consistencyScore <= maxConsistencyPercent;
  let withdrawalBlockReason: AccountMetrics["withdrawalBlockReason"] = null;
  if (!targetReached) withdrawalBlockReason = "TARGET_NOT_REACHED";
  else if (!consistencyOk) withdrawalBlockReason = "CONSISTENCY_ABOVE_LIMIT";

  const withdrawalEligible = targetReached && consistencyOk;

  // Weekly discipline
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = endOfWeek(referenceDate);
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(weekEnd);
  const weeklyTradeCount = trades.filter(
    (t) => t.trade_date >= startKey && t.trade_date <= endKey
  ).length;
  const maxWeeklyTrades = Number(account.max_weekly_trades) || 3;
  const weeklyRemaining = Math.max(maxWeeklyTrades - weeklyTradeCount, 0);
  const weeklyLimitReached = weeklyTradeCount >= maxWeeklyTrades;

  // Trading days
  const tradingDays = dailyMap.size;

  return {
    startingCapital: startCap,
    currentCapital,
    totalWithdrawn,

    totalPnL,
    totalProfit,
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    grossProfit,
    grossLoss,
    profitFactor,
    averagePnL,

    biggestWinningDay,
    biggestLosingDay,
    tradingDays,

    consistencyScore,
    requiredTotalProfit,
    consistencyStatus,
    maxConsistencyPercent,

    withdrawalTarget,
    profitTowardTarget,
    amountRemaining,
    targetReached,
    withdrawalEligible,
    withdrawalBlockReason,

    weeklyTradeCount,
    maxWeeklyTrades,
    weeklyRemaining,
    weeklyLimitReached,

    dailyPnL,
    dailyMap,
  };
}

function emptyMetrics(account: Account | null): AccountMetrics {
  const startCap = Number(account?.starting_capital) || 0;
  const withdrawalTargetPercent = Number(
    account?.withdrawal_target_percent
  ) || 4;
  return {
    startingCapital: startCap,
    currentCapital: startCap,
    totalWithdrawn: 0,

    totalPnL: 0,
    totalProfit: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakevenTrades: 0,
    winRate: null,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: null,
    averagePnL: null,

    biggestWinningDay: 0,
    biggestLosingDay: 0,
    tradingDays: 0,

    consistencyScore: 0,
    requiredTotalProfit: 0,
    consistencyStatus: "safe",
    maxConsistencyPercent: Number(account?.max_consistency_percent) || 20,

    withdrawalTarget: startCap * (withdrawalTargetPercent / 100),
    profitTowardTarget: 0,
    amountRemaining: startCap * (withdrawalTargetPercent / 100),
    targetReached: false,
    withdrawalEligible: false,
    withdrawalBlockReason: null,

    weeklyTradeCount: 0,
    maxWeeklyTrades: Number(account?.max_weekly_trades) || 3,
    weeklyRemaining: Number(account?.max_weekly_trades) || 3,
    weeklyLimitReached: false,

    dailyPnL: [],
    dailyMap: new Map(),
  };
}

// ---------- Drawdown calculations ----------

export function computeDrawdownStatus(
  account: Account | null,
  trades: Trade[],
  withdrawals: Withdrawal[],
  referenceDate: Date = new Date()
): DrawdownStatus {
  const startCap = Number(account?.starting_capital) || 0;
  const totalPnL = trades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const totalWithdrawn = withdrawals.reduce(
    (s, w) => s + (Number(w.amount) || 0),
    0
  );
  const currentCapital = startCap + totalPnL - totalWithdrawn;

  // Walk through daily balances to find highest watermark (running)
  const dailyMap = buildDailyMap(trades);
  const sortedDays = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  let running = startCap;
  let watermark = startCap;
  for (const d of sortedDays) {
    running += d.pnl;
    if (running > watermark) watermark = running;
  }
  // Include current capital in watermark
  if (currentCapital > watermark) watermark = currentCapital;

  const totalDrawdownPercent =
    Number(account?.max_total_drawdown_percent) || 3;
  const trailingFloorAmount = watermark * (totalDrawdownPercent / 100);
  const trailingFloor = watermark - trailingFloorAmount;
  const trailingRemaining = currentCapital - trailingFloor;
  const trailingBreached = trailingRemaining <= 0;
  const trailingUsagePercent =
    trailingFloorAmount > 0
      ? Math.min(100, Math.max(0, ((watermark - currentCapital) / trailingFloorAmount) * 100))
      : 0;

  // Daily: look at today's trades
  const todayKey = toDateKey(referenceDate);
  const today = dailyMap.get(todayKey);
  const todayPnL = today ? today.pnl : 0;

  // Daily floor calculated on the balance at 00:00 UTC of today.
  // We approximate using the running balance through yesterday.
  let balanceAtStartOfToday = startCap;
  for (const d of sortedDays) {
    if (d.date >= todayKey) break;
    balanceAtStartOfToday += d.pnl;
  }

  const dailyDrawdownPercent =
    Number(account?.max_daily_drawdown_percent) || 2;
  const dailyFloorAmount = balanceAtStartOfToday * (dailyDrawdownPercent / 100);
  const dailyFloor = balanceAtStartOfToday - dailyFloorAmount;
  const dailyRemaining = dailyFloor - (balanceAtStartOfToday + todayPnL) + dailyFloorAmount;
  const dailyUsagePercent =
    dailyFloorAmount > 0
      ? Math.min(100, Math.max(0, (-todayPnL / dailyFloorAmount) * 100))
      : 0;
  const dailyBreached = todayPnL < 0 && Math.abs(todayPnL) >= dailyFloorAmount;

  return {
    highestWatermark: watermark,
    trailingFloorAmount,
    trailingFloor,
    trailingBreached,
    trailingRemaining,
    trailingUsagePercent,

    dailyFloorAmount,
    dailyFloor,
    todayPnL,
    dailyRemaining,
    dailyUsagePercent,
    dailyBreached,
  };
}

// ---------- Analytics helpers ----------

export interface BreakdownRow {
  key: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number | null;
  pnl: number;
  averagePnL: number | null;
}

export function breakdownBy(
  trades: Trade[],
  field: "instrument" | "strategy" | "setup_type" | "session" | "timeframe"
): BreakdownRow[] {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = (t[field] as string | null) ?? "Unspecified";
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  return Array.from(groups.entries())
    .map(([key, list]) => {
      const wins = list.filter((t) => t.result === "Win").length;
      const losses = list.filter((t) => t.result === "Loss").length;
      const breakeven = list.filter((t) => t.result === "Breakeven").length;
      const trades = list.length;
      const pnl = list.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
      const winRate = trades > 0 ? (wins / trades) * 100 : null;
      const averagePnL = trades > 0 ? pnl / trades : null;
      return { key, trades, wins, losses, breakeven, winRate, pnl, averagePnL };
    })
    .sort((a, b) => b.trades - a.trades);
}

// ---------- Equity curve (for analytics chart) ----------

export interface EquityPoint {
  date: string;
  balance: number;
  dailyPnL: number;
}

export function buildEquityCurve(
  account: Account | null,
  trades: Trade[]
): EquityPoint[] {
  if (!account) return [];
  const startCap = Number(account.starting_capital) || 0;
  const dailyMap = buildDailyMap(trades);
  const sorted = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const points: EquityPoint[] = [];
  let balance = startCap;
  for (const d of sorted) {
    balance += d.pnl;
    points.push({ date: d.date, balance, dailyPnL: d.pnl });
  }
  return points;
}

// ---------- Weekly review aggregation ----------

export interface WeeklyAggregate {
  weekStart: string;
  weekEnd: string;
  trades: Trade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  totalPnL: number;
  winRate: number | null;
  averagePnL: number | null;
  biggestWinningDay: number;
  biggestLosingDay: number;
  consistencyScore: number;
  strategiesUsed: string[];
  instrumentsTraded: string[];
  mistakes: string[];
  emotions: string[];
}

export function aggregateWeek(
  trades: Trade[],
  weekStartDate: Date
): WeeklyAggregate {
  const weekEnd = endOfWeek(weekStartDate);
  const startKey = toDateKey(weekStartDate);
  const endKey = toDateKey(weekEnd);

  const inWeek = trades.filter(
    (t) => t.trade_date >= startKey && t.trade_date <= endKey
  );

  const totalTrades = inWeek.length;
  const winningTrades = inWeek.filter((t) => t.result === "Win").length;
  const losingTrades = inWeek.filter((t) => t.result === "Loss").length;
  const breakevenTrades = inWeek.filter((t) => t.result === "Breakeven").length;
  const totalPnL = inWeek.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null;
  const averagePnL = totalTrades > 0 ? totalPnL / totalTrades : null;

  const dailyMap = buildDailyMap(inWeek);
  let biggestWinningDay = 0;
  let biggestLosingDay = 0;
  for (const d of dailyMap.values()) {
    if (d.pnl > biggestWinningDay) biggestWinningDay = d.pnl;
    if (d.pnl < biggestLosingDay) biggestLosingDay = d.pnl;
  }

  const totalProfit = Array.from(dailyMap.values()).reduce(
    (s, d) => s + Math.max(d.pnl, 0),
    0
  );
  let consistencyScore = 0;
  if (totalProfit > 0 && biggestWinningDay > 0) {
    const raw = (biggestWinningDay / totalProfit) * 100;
    consistencyScore = Number.isFinite(raw) ? raw : 0;
  }

  const strategiesUsed = Array.from(
    new Set(inWeek.map((t) => t.strategy).filter(Boolean) as string[])
  );
  const instrumentsTraded = Array.from(
    new Set(inWeek.map((t) => t.instrument).filter(Boolean) as string[])
  );
  const mistakes = Array.from(
    new Set(inWeek.map((t) => t.mistakes).filter(Boolean) as string[])
  );
  const emotions = Array.from(
    new Set(inWeek.map((t) => t.emotions).filter(Boolean) as string[])
  );

  return {
    weekStart: startKey,
    weekEnd: endKey,
    trades: inWeek,
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    totalPnL,
    winRate,
    averagePnL,
    biggestWinningDay,
    biggestLosingDay,
    consistencyScore,
    strategiesUsed,
    instrumentsTraded,
    mistakes,
    emotions,
  };
}

// ---------- Analysis stats ----------

export interface AnalysisStats {
  total: number;
  pending: number;
  correct: number;
  partial: number;
  incorrect: number;
  resolved: number;
  accuracy: number | null;
}

export function computeAnalysisStats(
  analyses: { outcome: string }[]
): AnalysisStats {
  const total = analyses.length;
  const pending = analyses.filter((a) => a.outcome === "Still Pending").length;
  const correct = analyses.filter((a) => a.outcome === "Correct").length;
  const partial = analyses.filter((a) => a.outcome === "Partially Correct").length;
  const incorrect = analyses.filter((a) => a.outcome === "Incorrect").length;
  const resolved = correct + partial + incorrect;
  const accuracy = resolved > 0 ? (correct / resolved) * 100 : null;
  return { total, pending, correct, partial, incorrect, resolved, accuracy };
}
