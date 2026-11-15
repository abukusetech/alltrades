// ALLTRADES — Account rule resolvers
//
// Prop firm accounts read their provider-specific rules from the legacy
// maven_rules JSONB column. The UI and user-facing language are provider
// agnostic. Personal accounts read only from personal_* columns.

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
  consistencyRequired: boolean | null;
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

/** Resolve configured prop firm rules without inventing missing values. */
export function getMavenRules(account: Account | null): ResolvedMavenRules {
  const rules = (account?.maven_rules ?? {}) as MavenRules;
  const dailyLossPercent =
    rules.daily_loss_percent ??
    (Number(account?.max_daily_drawdown_percent ?? 0) || null);
  const maxDrawdownPercent =
    rules.max_drawdown_percent ??
    (Number(account?.max_total_drawdown_percent ?? 0) || null);
  const maxConsistencyPercent =
    rules.max_consistency_percent ??
    (Number(account?.max_consistency_percent ?? 0) || null);
  const profitSplitPercent =
    (account as unknown as { profit_split_percent?: number } | null)
      ?.profit_split_percent ?? rules.profit_split_percent ?? null;
  const maxWeeklyTrades = rules.max_weekly_trades ?? account?.max_weekly_trades ?? null;
  const maxMonthlyTrades =
    rules.max_monthly_trades ??
    (account as unknown as { max_trades_per_month?: number } | null)
      ?.max_trades_per_month ??
    null;

  return {
    dailyLossPercent,
    maxDrawdownPercent,
    drawdownMethod: rules.drawdown_method ?? null,
    resetTimeUtc: rules.reset_time_utc ?? null,
    maxRiskPerTradePercent: rules.max_risk_per_trade_percent ?? null,
    consistencyRequired: rules.consistency_required ?? null,
    maxConsistencyPercent,
    minPayoutAmount: rules.min_payout_amount ?? null,
    profitSplitPercent,
    minTradingDays: rules.min_trading_days ?? null,
    maxWeeklyTrades,
    maxMonthlyTrades,
    tradingRestrictions: rules.trading_restrictions ?? null,
    notes: rules.notes ?? null,
  };
}

/** Personal rules never inherit prop firm rules. */
export function getPersonalRules(account: Account | null): ResolvedPersonalRules {
  return {
    riskPercentPerTrade: account?.personal_risk_percent ?? null,
    dailyLossPercent: account?.personal_daily_loss_percent ?? null,
    maxDrawdownPercent: account?.personal_max_drawdown_percent ?? null,
    notes: null,
  };
}

export function resolveRulesForAccount(account: Account | null): {
  type: AccountType;
  maven: ResolvedMavenRules | null;
  personal: ResolvedPersonalRules | null;
} {
  const type = account?.account_type ?? "UNCLASSIFIED";
  if (type === "MAVEN") return { type, maven: getMavenRules(account), personal: null };
  if (type === "PERSONAL") return { type, maven: null, personal: getPersonalRules(account) };
  return { type: "UNCLASSIFIED", maven: null, personal: null };
}

export function accountTypeLabel(type: AccountType): string {
  switch (type) {
    case "MAVEN":
      return "Prop Firm";
    case "PERSONAL":
      return "Personal Capital";
    default:
      return "Unclassified";
  }
}

export function accountTypeTone(type: AccountType): "brand" | "profit" | "warn" | "neutral" {
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
