// ALLTRADES — Account rule resolvers
//
// One source of truth for "what are this account's rules?"
// Maven accounts read from maven_rules (JSONB). Personal accounts
// read from personal_* columns. They NEVER read from each other.

import type {
  Account,
  AccountType,
  MavenRules,
  PersonalRules,
} from "@/lib/types";

export interface ResolvedMavenRules {
  dailyLossPercent: number | null;
  maxDrawdownPercent: number | null;
  drawdownMethod: MavenRules["drawdown_method"];
  resetTimeUtc: string | null;
  maxRiskPerTradePercent: number | null;
  consistencyRequired: boolean;
  maxConsistencyPercent: number | null;
  minPayoutAmount: number | null;
  profitSplitPercent: number | null;
  minTradingDays: number | null;
  maxWeeklyTrades: number | null;
  maxMonthlyTrades: number | null;
  tradingRestrictions: string | null;
  notes: string | null;
}

export interface ResolvedPersonalRules {
  riskPercentPerTrade: number | null;
  dailyLossPercent: number | null;
  maxDrawdownPercent: number | null;
  notes: string | null;
}

/**
 * Merge account-level defaults into the Maven rules JSONB.
 * Never invent values — return null when unconfigured.
 */
export function getMavenRules(account: Account | null): ResolvedMavenRules {
  const r = (account?.maven_rules ?? {}) as MavenRules;

  // Fall back to the account-level columns only if the JSONB is empty.
  // These columns were the original source pre-Phase 17.
  const dailyLossPercent =
    r.daily_loss_percent ??
    (Number(account?.max_daily_drawdown_percent ?? 0) || null);
  const maxDrawdownPercent =
    r.max_drawdown_percent ??
    (Number(account?.max_total_drawdown_percent ?? 0) || null);
  const maxConsistencyPercent =
    r.max_consistency_percent ??
    (Number(account?.max_consistency_percent ?? 0) || null);
  const profitSplitPercent =
    (account as unknown as { profit_split_percent?: number } | null)
      ?.profit_split_percent ?? r.profit_split_percent ?? null;
  const maxWeeklyTrades =
    r.max_weekly_trades ?? account?.max_weekly_trades ?? null;
  const maxMonthlyTrades =
    r.max_monthly_trades ??
    (account as unknown as { max_trades_per_month?: number } | null)
      ?.max_trades_per_month ??
    null;

  return {
    dailyLossPercent,
    maxDrawdownPercent,
    drawdownMethod: r.drawdown_method ?? "trailing",
    resetTimeUtc: r.reset_time_utc ?? "00:00",
    maxRiskPerTradePercent: r.max_risk_per_trade_percent ?? null,
    consistencyRequired: r.consistency_required ?? true,
    maxConsistencyPercent,
    minPayoutAmount: r.min_payout_amount ?? null,
    profitSplitPercent,
    minTradingDays: r.min_trading_days ?? null,
    maxWeeklyTrades,
    maxMonthlyTrades,
    tradingRestrictions: r.trading_restrictions ?? null,
    notes: r.notes ?? null,
  };
}

/**
 * Personal rules — user's own preferences. Never inherits Maven rules.
 */
export function getPersonalRules(account: Account | null): ResolvedPersonalRules {
  return {
    riskPercentPerTrade: account?.personal_risk_percent ?? null,
    dailyLossPercent: account?.personal_daily_loss_percent ?? null,
    maxDrawdownPercent: account?.personal_max_drawdown_percent ?? null,
    notes: null,
  };
}

/**
 * Return the currently-effective rules for an account, respecting
 * account_type. Never mix.
 */
export function resolveRulesForAccount(account: Account | null): {
  type: AccountType;
  maven: ResolvedMavenRules | null;
  personal: ResolvedPersonalRules | null;
} {
  const type = account?.account_type ?? "UNCLASSIFIED";
  if (type === "MAVEN") {
    return { type, maven: getMavenRules(account), personal: null };
  }
  if (type === "PERSONAL") {
    return { type, maven: null, personal: getPersonalRules(account) };
  }
  return { type: "UNCLASSIFIED", maven: null, personal: null };
}

/** Human-readable label for a given account type. */
export function accountTypeLabel(type: AccountType): string {
  switch (type) {
    case "MAVEN":
      return "Maven Prop Firm";
    case "PERSONAL":
      return "Personal Capital";
    default:
      return "Unclassified";
  }
}

/** Small tone for badges. */
export function accountTypeTone(
  type: AccountType
): "brand" | "profit" | "warn" | "neutral" {
  switch (type) {
    case "MAVEN":
      return "brand";
    case "PERSONAL":
      return "profit";
    case "UNCLASSIFIED":
      return "warn";
    default:
      return "neutral";
  }
}

