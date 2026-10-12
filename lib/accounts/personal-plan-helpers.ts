// ALLTRADES — Personal Trading Plan helpers
//
// Defaults, validation, and preview calculations for the user's own plan.
// Nothing here reads from Maven rules.

import type { PersonalTradingPlan } from "@/lib/types";

// ---------- Sensible defaults ----------

export function defaultPlanFields(currency = "USD"): Partial<PersonalTradingPlan> {
  return {
    version_label: "v1",
    effective_from: new Date().toISOString().slice(0, 10),
    is_active: true,
    currency,
    risk_basis: "balance",

    // Risk management defaults — conservative but user-editable
    default_risk_percent: 0.5,
    max_risk_percent: 1.0,
    high_quality_risk_percent: 0.75,
    low_quality_risk_percent: 0.25,
    max_daily_loss_percent: 2.0,
    max_weekly_loss_percent: 4.0,
    max_monthly_loss_percent: 8.0,
    max_drawdown_percent: 10.0,
    max_open_trades: 1,
    max_trades_per_day: 3,
    max_trades_per_week: 12,
    max_trades_per_month: 40,
    max_aggregate_open_risk_percent: 2.0,
    max_consecutive_losses: 3,
    cooldown_hours_after_loss: 4,
    limits_enabled: {
      max_daily_loss: true,
      max_weekly_loss: true,
      max_monthly_loss: true,
      max_drawdown: true,
      max_open_trades: true,
      max_trades_per_day: true,
      max_trades_per_week: false,
      max_trades_per_month: false,
      max_aggregate_risk: false,
      max_consecutive_losses: true,
      cooldown: false,
    },

    // Profit targets
    min_rr: 2.0,
    preferred_rr: 2.0,
    stop_after_daily_target: false,
    stop_after_weekly_target: false,
    stop_after_monthly_target: false,
    targets_enabled: {
      daily: false,
      weekly: false,
      monthly: false,
    },

    // SL / TP
    sl_unit: "pips",
    min_sl_pips: 5,
    max_sl_pips: 30,
    default_sl_pips: 15,
    tp_method: "rr",
    min_lot_size: 0.01,
    lot_increment: 0.01,
    breakeven_enabled: false,
    partial_close_enabled: false,
    trailing_stop_enabled: false,
    sl_tp_by_instrument: {},

    // Strategy
    require_htf_confirmation: false,
    require_market_structure: false,
    require_liquidity_conditions: false,
    require_entry_confirmation: false,
    approval_mode: "warning",

    // Schedule
    active_timezone: "UTC",
  };
}

// ---------- Validation ----------

export interface ValidationIssue {
  field: string;
  level: "error" | "warning";
  message: string;
}

export function validatePlan(
  plan: Partial<PersonalTradingPlan>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // --- errors ---
  if (
    plan.default_risk_percent != null &&
    (plan.default_risk_percent <= 0 || plan.default_risk_percent > 10)
  ) {
    issues.push({
      field: "default_risk_percent",
      level: "error",
      message: "Default risk must be between 0 and 10%.",
    });
  }
  if (
    plan.max_risk_percent != null &&
    plan.default_risk_percent != null &&
    plan.max_risk_percent < plan.default_risk_percent
  ) {
    issues.push({
      field: "max_risk_percent",
      level: "error",
      message: "Max risk cannot be lower than default risk.",
    });
  }
  if (
    plan.high_quality_risk_percent != null &&
    plan.max_risk_percent != null &&
    plan.high_quality_risk_percent > plan.max_risk_percent
  ) {
    issues.push({
      field: "high_quality_risk_percent",
      level: "error",
      message: "High-quality risk cannot exceed max risk.",
    });
  }
  if (
    plan.min_rr != null &&
    plan.preferred_rr != null &&
    plan.preferred_rr < plan.min_rr
  ) {
    issues.push({
      field: "preferred_rr",
      level: "error",
      message: "Preferred R:R must be at least the minimum R:R.",
    });
  }
  if (
    plan.min_sl_pips != null &&
    plan.max_sl_pips != null &&
    plan.min_sl_pips > plan.max_sl_pips
  ) {
    issues.push({
      field: "min_sl_pips",
      level: "error",
      message: "Min SL cannot be greater than max SL.",
    });
  }
  if (
    plan.min_lot_size != null &&
    plan.max_lot_size != null &&
    plan.max_lot_size < plan.min_lot_size
  ) {
    issues.push({
      field: "max_lot_size",
      level: "error",
      message: "Max lot size cannot be lower than min lot size.",
    });
  }

  // --- warnings ---
  if (
    plan.default_risk_percent != null &&
    plan.default_risk_percent >= 2
  ) {
    issues.push({
      field: "default_risk_percent",
      level: "warning",
      message: "Default risk ≥ 2% per trade is aggressive. Small losing streaks can wipe large equity.",
    });
  }
  if (
    plan.max_daily_loss_percent != null &&
    plan.default_risk_percent != null &&
    plan.max_daily_loss_percent <= plan.default_risk_percent * 2
  ) {
    issues.push({
      field: "max_daily_loss_percent",
      level: "warning",
      message: "Daily loss limit is tight — only 1–2 losing trades may breach it.",
    });
  }

  return issues;
}

// ---------- Preview calculation ----------

export interface PlanPreview {
  accountCapital: number;
  riskPerTradeAmount: number;
  maxRiskAmount: number;
  dailyLossAmount: number;
  weeklyLossAmount: number;
  monthlyLossAmount: number;
  maxDrawdownAmount: number;
  targetDailyAmount: number | null;
  targetWeeklyAmount: number | null;
  targetMonthlyAmount: number | null;
}

export function computePlanPreview(
  plan: Partial<PersonalTradingPlan>,
  accountCapital: number
): PlanPreview {
  const cap = Math.max(accountCapital, 0);
  const pct = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? (cap * v) / 100 : 0;

  return {
    accountCapital: cap,
    riskPerTradeAmount: pct(plan.default_risk_percent),
    maxRiskAmount: pct(plan.max_risk_percent),
    dailyLossAmount: pct(plan.max_daily_loss_percent),
    weeklyLossAmount: pct(plan.max_weekly_loss_percent),
    monthlyLossAmount: pct(plan.max_monthly_loss_percent),
    maxDrawdownAmount: pct(plan.max_drawdown_percent),
    targetDailyAmount:
      plan.daily_target_percent != null ? pct(plan.daily_target_percent) : null,
    targetWeeklyAmount:
      plan.weekly_target_percent != null ? pct(plan.weekly_target_percent) : null,
    targetMonthlyAmount:
      plan.monthly_target_percent != null ? pct(plan.monthly_target_percent) : null,
  };
}
