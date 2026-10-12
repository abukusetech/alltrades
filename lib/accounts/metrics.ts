// ALLTRADES — Type-aware metric engine
//
// Takes a filtered list of accounts + their trades/withdrawals and returns
// correctly-separated metrics for Maven vs Personal. Never mixes the two.

import type { Account, Trade, Withdrawal, AccountType } from "@/lib/types";

export interface SimpleMetrics {
  accountCount: number;
  totalCapital: number;          // sum of starting capital
  currentCapital: number;        // current capital (after P/L and withdrawals)
  totalPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number | null;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  averagePnL: number | null;
  totalWithdrawn: number;
  biggestWinningDay: number;
  biggestLosingDay: number;
  totalProfit: number;            // sum of positive daily P/L
  consistencyScore: number;       // 0-100
}

export function emptySimpleMetrics(): SimpleMetrics {
  return {
    accountCount: 0,
    totalCapital: 0,
    currentCapital: 0,
    totalPnL: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakevenTrades: 0,
    winRate: null,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: null,
    averagePnL: null,
    totalWithdrawn: 0,
    biggestWinningDay: 0,
    biggestLosingDay: 0,
    totalProfit: 0,
    consistencyScore: 0,
  };
}

/**
 * Compute metrics for a set of accounts using only their own trades
 * and withdrawals.
 */
export function computeMetricsForAccounts(
  accounts: Account[],
  trades: Trade[],
  withdrawals: Withdrawal[]
): SimpleMetrics {
  if (accounts.length === 0) return emptySimpleMetrics();

  const accountIds = new Set(accounts.map((a) => a.id));
  const scopedTrades = trades.filter((t) => accountIds.has(t.account_id));
  const scopedWithdrawals = withdrawals.filter((w) =>
    accountIds.has(w.account_id)
  );

  const totalCapital = accounts.reduce(
    (s, a) => s + Number(a.starting_capital || 0),
    0
  );
  const totalWithdrawn = scopedWithdrawals.reduce(
    (s, w) => s + Number(w.amount || 0),
    0
  );
  const totalPnL = scopedTrades.reduce(
    (s, t) => s + Number(t.profit_loss || 0),
    0
  );
  const currentCapital = totalCapital + totalPnL - totalWithdrawn;

  const winningTrades = scopedTrades.filter((t) => t.result === "Win").length;
  const losingTrades = scopedTrades.filter((t) => t.result === "Loss").length;
  const breakevenTrades = scopedTrades.filter(
    (t) => t.result === "Breakeven"
  ).length;
  const totalTrades = scopedTrades.length;

  const grossProfit = scopedTrades
    .filter((t) => Number(t.profit_loss) > 0)
    .reduce((s, t) => s + Number(t.profit_loss), 0);
  const grossLoss = Math.abs(
    scopedTrades
      .filter((t) => Number(t.profit_loss) < 0)
      .reduce((s, t) => s + Number(t.profit_loss), 0)
  );

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : null;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;
  const averagePnL = totalTrades > 0 ? totalPnL / totalTrades : null;

  // Daily buckets
  const dailyMap = new Map<string, number>();
  for (const t of scopedTrades) {
    dailyMap.set(
      t.trade_date,
      (dailyMap.get(t.trade_date) ?? 0) + Number(t.profit_loss || 0)
    );
  }
  let biggestWinningDay = 0;
  let biggestLosingDay = 0;
  let totalProfit = 0;
  for (const v of dailyMap.values()) {
    if (v > biggestWinningDay) biggestWinningDay = v;
    if (v < biggestLosingDay) biggestLosingDay = v;
    if (v > 0) totalProfit += v;
  }

  let consistencyScore = 0;
  if (totalProfit > 0 && biggestWinningDay > 0) {
    const raw = (biggestWinningDay / totalProfit) * 100;
    consistencyScore = Number.isFinite(raw) ? Math.round(raw) : 0;
  }

  return {
    accountCount: accounts.length,
    totalCapital,
    currentCapital,
    totalPnL,
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate,
    grossProfit,
    grossLoss,
    profitFactor,
    averagePnL,
    totalWithdrawn,
    biggestWinningDay,
    biggestLosingDay,
    totalProfit,
    consistencyScore,
  };
}

export interface GroupedMetrics {
  maven: SimpleMetrics;
  personal: SimpleMetrics;
  unclassified: SimpleMetrics;
  mavenAccounts: Account[];
  personalAccounts: Account[];
  unclassifiedAccounts: Account[];
}

/**
 * Split a set of accounts into type groups and compute per-group metrics.
 */
export function groupMetricsByType(
  accounts: Account[],
  trades: Trade[],
  withdrawals: Withdrawal[]
): GroupedMetrics {
  const mavenAccounts = accounts.filter((a) => a.account_type === "MAVEN");
  const personalAccounts = accounts.filter((a) => a.account_type === "PERSONAL");
  const unclassifiedAccounts = accounts.filter(
    (a) => a.account_type === "UNCLASSIFIED"
  );

  return {
    maven: computeMetricsForAccounts(mavenAccounts, trades, withdrawals),
    personal: computeMetricsForAccounts(personalAccounts, trades, withdrawals),
    unclassified: computeMetricsForAccounts(
      unclassifiedAccounts,
      trades,
      withdrawals
    ),
    mavenAccounts,
    personalAccounts,
    unclassifiedAccounts,
  };
}

/** Human label for a metric block. */
export function blockLabel(type: AccountType): string {
  switch (type) {
    case "MAVEN":
      return "Maven Prop Firm";
    case "PERSONAL":
      return "Personal Capital";
    default:
      return "Unclassified";
  }
}
