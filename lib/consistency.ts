// ALLTRADES — Maven Instant Funding consistency score
//
// Single source of truth. Pure functions only.
//
// Formula (Option A — net P/L denominator):
//   Consistency Score   = (Biggest Winning Day ÷ Total Net Profit) × 100%
//   Target Net Profit   = Biggest Winning Day ÷ 0.20
//   Additional Required = max(0, Target Net Profit − Total Net Profit)
//
// N/A rule:
//   score is null when Total Net Profit ≤ 0. The additional-profit
//   calculator STILL runs (it handles negative current profit correctly).
//
// No ×5. No gross-profitable-day denominator.

import type { Trade } from "@/lib/types";

export interface ConsistencyDailyPoint {
  date: string; // YYYY-MM-DD (UTC day)
  pnl: number;
}

export type ConsistencyStatus = "passed" | "failed" | "na";

export interface ConsistencyResult {
  /** Highest single UTC-day net P/L. 0 when no profitable days exist. */
  biggestWinningDay: number;
  /** Σ of ALL daily net P/L in the cycle. Can be negative. */
  totalProfit: number;
  /** Biggest ÷ Total × 100. null when Total ≤ 0 (N/A). */
  score: number | null;
  /** Maximum allowed score. Default 20. */
  maxAllowed: number;
  /** Derived from score vs maxAllowed. */
  status: ConsistencyStatus;
  /** True only when status === "passed". N/A is NOT eligible. */
  eligible: boolean;

  /** Biggest ÷ (maxAllowed/100). null when biggest is 0. */
  targetTotalProfit: number | null;
  /**
   * max(0, targetTotalProfit − totalProfit).
   * Still computed when score is N/A (negative totalProfit is treated as an
   * amount that must be earned back PLUS the target).
   */
  additionalProfitRequired: number | null;

  /** Per-day breakdown (UTC), sorted ascending. */
  dailyProfits: ConsistencyDailyPoint[];
  /** Number of trades included after cycle-scoping. */
  tradeCount: number;
}

export interface ConsistencyInput {
  trades: Trade[];
  /** YYYY-MM-DD. When set, only trades on/after this UTC date are counted. */
  cycleStartDate?: string | null;
  /** Default 20. */
  maxAllowed?: number;
}

function tradeUtcDay(t: Trade): string {
  const date = t.trade_date;
  if (!date) return "";
  if (!t.trade_time) return date;

  const time = t.trade_time.length === 5 ? `${t.trade_time}:00` : t.trade_time;
  const d = new Date(`${date}T${time}Z`);
  if (Number.isNaN(d.getTime())) return date;

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function computeConsistency(input: ConsistencyInput): ConsistencyResult {
  const maxAllowed = input.maxAllowed ?? 20;
  const cycleStart = input.cycleStartDate ?? null;

  const scoped = cycleStart
    ? input.trades.filter((t) => tradeUtcDay(t) >= cycleStart)
    : input.trades;

  const byDay = new Map<string, number>();
  for (const t of scoped) {
    const day = tradeUtcDay(t);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + (Number(t.profit_loss) || 0));
  }

  const dailyProfits: ConsistencyDailyPoint[] = Array.from(byDay.entries())
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let biggestWinningDay = 0;
  let totalProfit = 0;
  for (const d of dailyProfits) {
    totalProfit += d.pnl;
    if (d.pnl > biggestWinningDay) biggestWinningDay = d.pnl;
  }

  // Score — N/A when no scoreable profit.
  let score: number | null = null;
  if (totalProfit > 0 && biggestWinningDay > 0) {
    const raw = (biggestWinningDay / totalProfit) * 100;
    score = Number.isFinite(raw) ? Number(raw.toFixed(4)) : null;
  }

  const status: ConsistencyStatus =
    score === null ? "na" : score <= maxAllowed ? "passed" : "failed";

  // Target total profit and additional profit required.
  // Both only depend on biggestWinningDay; they always compute when there
  // is a biggest winning day — even if the score itself is N/A.
  let targetTotalProfit: number | null = null;
  let additionalProfitRequired: number | null = null;

  if (biggestWinningDay > 0 && maxAllowed > 0) {
    const target = biggestWinningDay / (maxAllowed / 100);
    if (Number.isFinite(target)) {
      targetTotalProfit = Number(target.toFixed(2));
      const needed = target - totalProfit;
      additionalProfitRequired = Number(
        (needed > 0 ? needed : 0).toFixed(2)
      );
    }
  } else {
    // No biggest winning day → nothing to reach.
    targetTotalProfit = 0;
    additionalProfitRequired = 0;
  }

  return {
    biggestWinningDay: Number(biggestWinningDay.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    score,
    maxAllowed,
    status,
    eligible: status === "passed",
    targetTotalProfit,
    additionalProfitRequired,
    dailyProfits,
    tradeCount: scoped.length,
  };
}
