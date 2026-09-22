// ALLTRADES — Trading discipline calculations
// Pure functions. Feed them real trades and account data.

import type { Trade, Account } from "@/lib/types";
import { parseNumberOrNull } from "@/lib/utils";

// ---------- Types ----------

export interface RiskUsage {
  todayPnL: number;
  capital: number;
  riskPercent: number;
  riskBudget: number;
  riskUsed: number;
  riskRemaining: number;
  riskUsagePercent: number;
  level: "safe" | "approaching" | "breached";
}

export interface MonthlyCounter {
  trades: number;
  cap: number;
  remaining: number;
  percent: number;
  reached: boolean;
}

export interface RRComparison {
  planned: string | null;
  plannedValue: number | null;
  actualValue: number | null;
  actual: string | null;
  delta: number | null;
  direction: "better" | "worse" | "match" | "unknown";
}

export interface SessionRow {
  session: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number | null;
  avgRR: number | null;
  pnl: number;
}

export interface DisciplineRule {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface DisciplineScore {
  percent: number;
  passed: number;
  total: number;
  rules: DisciplineRule[];
}

export interface SetupChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

export interface SetupScore {
  percent: number;
  passed: number;
  total: number;
  grade: string; // "A", "B", "C", "D"
  label: string; // "A SETUP" etc.
}

export interface TradeCheckItem {
  key: string;
  label: string;
  passed: boolean;
  hint?: string;
}

export interface TradeCheckResult {
  items: TradeCheckItem[];
  ready: boolean;
  status: "READY" | "SESSION_COMPLETE" | "BLOCKED";
  message: string;
}

export interface MonthlyPerformance {
  monthLabel: string;
  startingBalance: number;
  currentBalance: number;
  returnPercent: number;
  targetPercent: number;
  trades: number;
  tradesCap: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number | null;
  averageRR: number | null;
  profitFactor: number | null;
  disciplinePercent: number;
}

// ---------- Helpers ----------

/** Parse "1:2" or "1 : 2.14" into 2 or 2.14 — the R multiple (second number / first number). */
export function parseRR(s: string | null | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/\s+/g, "");
  const m = cleaned.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return null;
  return b / a;
}

export function formatRR(r: number | null): string {
  if (r === null || !Number.isFinite(r)) return "—";
  return `1:${r.toFixed(2)}`;
}

/** Actual R multiple from a trade: profit_loss / risk_amount, if both exist. */
export function actualRFromTrade(t: Trade): number | null {
  const pl = Number(t.profit_loss) || 0;
  const risk = parseNumberOrNull(t.risk_amount);
  if (!risk || risk <= 0) return null;
  return pl / risk;
}

// ---------- Risk usage ----------

export function computeDailyRiskUsage(
  todayPnL: number,
  currentCapital: number,
  riskPercent: number
): RiskUsage {
  const capital = Math.max(currentCapital, 0);
  const riskBudget = (capital * riskPercent) / 100;
  const riskUsed = Math.max(-todayPnL, 0);
  const riskRemaining = Math.max(riskBudget - riskUsed, 0);
  const percent =
    riskBudget > 0 ? Math.min(100, (riskUsed / riskBudget) * 100) : 0;

  let level: RiskUsage["level"] = "safe";
  if (percent >= 100) level = "breached";
  else if (percent >= 70) level = "approaching";

  return {
    todayPnL,
    capital,
    riskPercent,
    riskBudget,
    riskUsed,
    riskRemaining,
    riskUsagePercent: percent,
    level,
  };
}

// ---------- Monthly counter ----------

export function computeMonthlyCounter(
  trades: Trade[],
  year: number,
  monthZeroIndexed: number,
  cap: number
): MonthlyCounter {
  const inMonth = trades.filter((t) => {
    const d = new Date(t.trade_date + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === monthZeroIndexed;
  });
  const tradesCount = inMonth.length;
  const remaining = Math.max(cap - tradesCount, 0);
  const percent = cap > 0 ? Math.min(100, (tradesCount / cap) * 100) : 0;
  return {
    trades: tradesCount,
    cap,
    remaining,
    percent,
    reached: tradesCount >= cap,
  };
}

// ---------- Planned vs actual RR ----------

export function compareRR(t: Trade): RRComparison {
  const plannedValue = parseRR(t.risk_reward);
  const actualValue = actualRFromTrade(t);
  const planned = t.risk_reward ?? null;
  const actual = actualValue !== null ? formatRR(actualValue) : null;

  if (plannedValue === null || actualValue === null) {
    return {
      planned,
      plannedValue,
      actualValue,
      actual,
      delta: null,
      direction: "unknown",
    };
  }

  const delta = actualValue - plannedValue;
  const direction: RRComparison["direction"] =
    Math.abs(delta) < 0.05 ? "match" : delta > 0 ? "better" : "worse";

  return { planned, plannedValue, actualValue, actual, delta, direction };
}

// ---------- Best session analysis ----------

export function analyzeSessions(trades: Trade[]): SessionRow[] {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = (t.session ?? "Unspecified").trim() || "Unspecified";
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([session, list]) => {
      const wins = list.filter((t) => t.result === "Win").length;
      const losses = list.filter((t) => t.result === "Loss").length;
      const breakeven = list.filter((t) => t.result === "Breakeven").length;
      const total = list.length;
      const winRate = total > 0 ? (wins / total) * 100 : null;
      const pnl = list.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);

      const rs = list
        .map(actualRFromTrade)
        .filter((v): v is number => v !== null && Number.isFinite(v));
      const avgRR = rs.length > 0 ? rs.reduce((s, v) => s + v, 0) / rs.length : null;

      return {
        session,
        trades: total,
        wins,
        losses,
        breakeven,
        winRate,
        avgRR,
        pnl,
      };
    })
    .sort((a, b) => b.trades - a.trades);
}

// ---------- Discipline score ----------

export interface DisciplineContext {
  trades: Trade[];
  account: Account;
  currentCapital: number;
  rules: {
    maxTradesPerDay?: number;
    allowedInstrument?: string | null;
    maxRiskPercentPerTrade?: number;
    forbiddenOnNews?: boolean;
    minRR?: number;
    maxTradesPerMonth?: number;
  };
}

export function computeDisciplineScore(
  ctx: DisciplineContext
): DisciplineScore {
  const {
    trades,
    account,
    currentCapital,
    rules,
  } = ctx;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter((t) => t.trade_date === todayKey);

  const rules_: DisciplineRule[] = [];

  // Rule 1: Max trades per day
  if (rules.maxTradesPerDay && rules.maxTradesPerDay > 0) {
    const count = todayTrades.length;
    rules_.push({
      key: "max_trades_per_day",
      label: `${rules.maxTradesPerDay} trade${rules.maxTradesPerDay > 1 ? "s" : ""}/day`,
      passed: count <= rules.maxTradesPerDay,
      detail: `${count} taken today`,
    });
  }

  // Rule 2: Instrument restriction
  if (rules.allowedInstrument) {
    const mismatched = trades.filter(
      (t) => t.instrument !== rules.allowedInstrument
    );
    rules_.push({
      key: "instrument_only",
      label: `${rules.allowedInstrument} only`,
      passed: mismatched.length === 0,
      detail:
        mismatched.length === 0
          ? "All trades match"
          : `${mismatched.length} off-plan trade${mismatched.length > 1 ? "s" : ""}`,
    });
  }

  // Rule 3: Risk respected (per trade)
  if (rules.maxRiskPercentPerTrade && currentCapital > 0) {
    const maxRiskAmount = (currentCapital * rules.maxRiskPercentPerTrade) / 100;
    const riskyTrades = trades.filter((t) => {
      const risk = parseNumberOrNull(t.risk_amount);
      return risk !== null && risk > maxRiskAmount + 0.01;
    });
    rules_.push({
      key: "risk_respected",
      label: `Risk ≤ ${rules.maxRiskPercentPerTrade}%`,
      passed: riskyTrades.length === 0,
      detail:
        riskyTrades.length === 0
          ? "All trades within limit"
          : `${riskyTrades.length} over limit`,
    });
  }

  // Rule 4: No news trade
  if (rules.forbiddenOnNews) {
    const newsTrades = trades.filter((t) => {
      const e = (t.news_event ?? "").toLowerCase();
      return (
        e.includes("high impact") ||
        e === "cpi" ||
        e === "nfp" ||
        e === "fomc" ||
        e.includes("interest rate")
      );
    });
    rules_.push({
      key: "no_news_trade",
      label: "No news trades",
      passed: newsTrades.length === 0,
      detail:
        newsTrades.length === 0
          ? "None recorded"
          : `${newsTrades.length} news trade${newsTrades.length > 1 ? "s" : ""}`,
    });
  }

  // Rule 5: Min RR respected
  if (rules.minRR && rules.minRR > 0) {
    const lowRRTrades = trades.filter((t) => {
      const planned = parseRR(t.risk_reward);
      return planned !== null && planned < rules.minRR!;
    });
    rules_.push({
      key: "min_rr",
      label: `RR ≥ 1:${rules.minRR}`,
      passed: lowRRTrades.length === 0,
      detail:
        lowRRTrades.length === 0
          ? "All trades met minimum"
          : `${lowRRTrades.length} below minimum`,
    });
  }

  // Rule 6: No revenge trade (loss immediately followed by another trade same day)
  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byDay.get(t.trade_date) ?? [];
    list.push(t);
    byDay.set(t.trade_date, list);
  }
  let revengeCount = 0;
  for (const list of byDay.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) =>
      (a.trade_time ?? "").localeCompare(b.trade_time ?? "")
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].result === "Loss") revengeCount++;
    }
  }
  rules_.push({
    key: "no_revenge_trade",
    label: "No revenge trade",
    passed: revengeCount === 0,
    detail:
      revengeCount === 0
        ? "None detected"
        : `${revengeCount} trade${revengeCount > 1 ? "s" : ""} after a loss`,
  });

  // Rule 7: Stop loss respected (if SL was set, PL must not exceed it in absolute terms by much)
  const slBreaches = trades.filter((t) => {
    const sl = parseNumberOrNull(t.stop_loss);
    if (sl === null) return false;
    const pl = Number(t.profit_loss) || 0;
    const risk = parseNumberOrNull(t.risk_amount) ?? 0;
    if (risk <= 0) return false;
    // If the loss is more than 1.5x risk, they didn't respect the SL
    return pl < -1.5 * risk;
  });
  rules_.push({
    key: "sl_respected",
    label: "SL respected",
    passed: slBreaches.length === 0,
    detail:
      slBreaches.length === 0
        ? "All losses within SL"
        : `${slBreaches.length} overshoot${slBreaches.length > 1 ? "s" : ""}`,
  });

  // Rule 8: Monthly trade cap
  if (rules.maxTradesPerMonth && rules.maxTradesPerMonth > 0) {
    const now = new Date();
    const monthTrades = trades.filter((t) => {
      const d = new Date(t.trade_date + "T00:00:00");
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    });
    rules_.push({
      key: "monthly_cap",
      label: `${rules.maxTradesPerMonth} trades/month`,
      passed: monthTrades.length <= rules.maxTradesPerMonth,
      detail: `${monthTrades.length} taken this month`,
    });
  }

  const passed = rules_.filter((r) => r.passed).length;
  const total = rules_.length;
  const percent = total > 0 ? (passed / total) * 100 : 0;

  return { percent, passed, total, rules: rules_ };
}

// ---------- Setup quality score ----------

export function computeSetupScore(
  checklist: SetupChecklistItem[]
): SetupScore {
  const total = checklist.length;
  const passed = checklist.filter((c) => c.checked).length;
  const percent = total > 0 ? (passed / total) * 100 : 0;

  let grade = "D";
  let label = "D SETUP";
  if (percent >= 95) {
    grade = "A+";
    label = "A+ SETUP";
  } else if (percent >= 85) {
    grade = "A";
    label = "A SETUP";
  } else if (percent >= 70) {
    grade = "B";
    label = "B SETUP";
  } else if (percent >= 55) {
    grade = "C";
    label = "C SETUP";
  }

  return { percent, passed, total, grade, label };
}

// ---------- Should I trade? ----------

export interface TradeCheckInput {
  instrument: string | null;
  allowedInstrument: string | null;
  newsClear: boolean;
  setupConfirmed: boolean;
  riskWithinLimit: boolean;
  rrMeetsMinimum: boolean;
  tradedToday: boolean;
}

export function computeTradeCheck(input: TradeCheckInput): TradeCheckResult {
  const items: TradeCheckItem[] = [
    {
      key: "instrument",
      label: input.allowedInstrument
        ? `${input.allowedInstrument} only`
        : "Instrument selected",
      passed: !!input.instrument && (
        !input.allowedInstrument || input.instrument === input.allowedInstrument
      ),
      hint: input.allowedInstrument
        ? `Trade only ${input.allowedInstrument}`
        : undefined,
    },
    {
      key: "news",
      label: "News clear",
      passed: input.newsClear,
    },
    {
      key: "setup",
      label: "Setup confirmed",
      passed: input.setupConfirmed,
    },
    {
      key: "risk",
      label: "Risk within limit",
      passed: input.riskWithinLimit,
    },
    {
      key: "rr",
      label: "RR meets minimum",
      passed: input.rrMeetsMinimum,
    },
    {
      key: "not_yet_traded",
      label: "Trade taken today",
      passed: !input.tradedToday,
      hint: input.tradedToday ? "Already taken" : "Not yet",
    },
  ];

  const ready = items.every((i) => i.passed);
  if (input.tradedToday) {
    return {
      items,
      ready: false,
      status: "SESSION_COMPLETE",
      message: "SESSION COMPLETE — Do not take another trade today.",
    };
  }
  if (!ready) {
    return {
      items,
      ready: false,
      status: "BLOCKED",
      message: "Not all conditions met. Wait for a clean setup.",
    };
  }
  return {
    items,
    ready: true,
    status: "READY",
    message: "READY TO TRADE",
  };
}

// ---------- Monthly performance ----------

export function computeMonthlyPerformance(
  trades: Trade[],
  account: Account,
  currentCapital: number,
  disciplinePercent: number,
  tradesCap: number,
  targetPercent: number,
  referenceDate: Date = new Date()
): MonthlyPerformance {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const inMonth = trades.filter((t) => {
    const d = new Date(t.trade_date + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Starting balance = capital at start of month = currentCapital - monthPnL
  const monthPnL = inMonth.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const startingBalance = Math.max(currentCapital - monthPnL, 0);

  const wins = inMonth.filter((t) => t.result === "Win").length;
  const losses = inMonth.filter((t) => t.result === "Loss").length;
  const breakeven = inMonth.filter((t) => t.result === "Breakeven").length;
  const total = inMonth.length;
  const winRate = total > 0 ? (wins / total) * 100 : null;

  const grossProfit = inMonth
    .filter((t) => (Number(t.profit_loss) || 0) > 0)
    .reduce((s, t) => s + (Number(t.profit_loss) || 0), 0);
  const grossLoss = Math.abs(
    inMonth
      .filter((t) => (Number(t.profit_loss) || 0) < 0)
      .reduce((s, t) => s + (Number(t.profit_loss) || 0), 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  const rs = inMonth
    .map(actualRFromTrade)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const averageRR =
    rs.length > 0 ? rs.reduce((s, v) => s + v, 0) / rs.length : null;

  const returnPercent =
    startingBalance > 0 ? (monthPnL / startingBalance) * 100 : 0;

  const monthLabel = referenceDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return {
    monthLabel,
    startingBalance,
    currentBalance: currentCapital,
    returnPercent,
    targetPercent,
    trades: total,
    tradesCap,
    wins,
    losses,
    breakeven,
    winRate,
    averageRR,
    profitFactor,
    disciplinePercent,
  };
}
