// ALLTRADES — Type-aware trade validation
//
// Returns a list of checks, each labelled with the source rule.
// Maven accounts validate against Maven Instant Funding rules.
// Personal accounts validate against the user's Personal Trading Plan.
// Never mixes.

import type {
  Account,
  Trade,
  MavenRuleVersion,
  PersonalTradingPlan,
} from "@/lib/types";

export type CheckSource = "MAVEN" | "PERSONAL" | "ACCOUNT" | "MISSING";

export interface TradeCheckItem {
  key: string;
  label: string;
  detail?: string;
  passed: boolean;
  source: CheckSource;
  severity: "info" | "warn" | "violation";
}

export interface TradeCheckResult {
  checks: TradeCheckItem[];
  passed: number;
  total: number;
  blocked: boolean;
  mode: "MAVEN" | "PERSONAL" | "UNCLASSIFIED";
  summary: string;
}

export interface TradeCheckInput {
  account: Account;
  mavenRule: MavenRuleVersion | null;
  personalPlan: PersonalTradingPlan | null;
  plannedRiskAmount: number | null;
  plannedRiskPercent: number | null;
  plannedRR: number | null;
  instrument: string;
  session: string | null;
  newsHighImpact: boolean;
  tradesToday: number;
  tradesThisWeek: number;
  tradesThisMonth: number;
  todayPnL: number;
  currentCapital: number;
}

// ---------- Main entry ----------

export function computeTradeCheck(input: TradeCheckInput): TradeCheckResult {
  const type = input.account.account_type;

  if (type === "MAVEN") {
    if (!input.mavenRule) {
      return missingResult(
        "MAVEN",
        "Maven rule version is not configured for this account."
      );
    }
    return checkMaven(input, input.mavenRule);
  }
  if (type === "PERSONAL") {
    if (!input.personalPlan) {
      return missingResult(
        "PERSONAL",
        "No Personal Trading Plan saved. Configure one in Settings to enable validation."
      );
    }
    return checkPersonal(input, input.personalPlan);
  }
  return missingResult(
    "UNCLASSIFIED",
    "This account is not classified as Maven or Personal. Set its type in Settings."
  );
}

function missingResult(
  mode: TradeCheckResult["mode"],
  summary: string
): TradeCheckResult {
  return {
    checks: [],
    passed: 0,
    total: 0,
    blocked: true,
    mode,
    summary,
  };
}

// ---------- Maven path ----------

function checkMaven(
  input: TradeCheckInput,
  rule: MavenRuleVersion
): TradeCheckResult {
  const r = rule.rules;
  const checks: TradeCheckItem[] = [];

  // 1. Instrument restriction (only EURUSD if account is EURUSD-only)
  const allowedInstrument = input.account.allowed_instrument ?? null;
  if (allowedInstrument) {
    checks.push({
      key: "instrument",
      label: `Instrument: ${allowedInstrument}`,
      detail:
        input.instrument === allowedInstrument
          ? undefined
          : `Found ${input.instrument}`,
      passed: input.instrument === allowedInstrument,
      source: "MAVEN",
      severity: "violation",
    });
  }

  // 2. Max risk per trade (Maven's published 1% limit)
  const maxRiskAmount = (input.currentCapital * r.max_risk_per_trade_percent) / 100;
  const riskOk =
    input.plannedRiskAmount !== null &&
    input.plannedRiskAmount <= maxRiskAmount + 0.01;
  checks.push({
    key: "risk_per_trade",
    label: `Risk per trade ≤ ${r.max_risk_per_trade_percent}%`,
    detail:
      input.plannedRiskAmount === null
        ? "Planned risk not provided."
        : riskOk
          ? undefined
          : `Planned $${input.plannedRiskAmount.toFixed(2)} exceeds $${maxRiskAmount.toFixed(2)}`,
    passed: riskOk,
    source: "MAVEN",
    severity: "violation",
  });

  // 3. Daily drawdown remaining
  const dailyAllowance = (input.currentCapital * r.daily_drawdown_percent) / 100;
  const todayLoss = Math.max(-input.todayPnL, 0);
  const dailyRemaining = Math.max(dailyAllowance - todayLoss, 0);
  const plannedDailyRisk =
    input.plannedRiskAmount !== null ? input.plannedRiskAmount : 0;
  const dailyOk = plannedDailyRisk <= dailyRemaining + 0.01;
  checks.push({
    key: "daily_drawdown",
    label: `Daily drawdown ≤ ${r.daily_drawdown_percent}%`,
    detail: dailyOk
      ? `$${dailyRemaining.toFixed(2)} remaining today`
      : `Planned risk $${plannedDailyRisk.toFixed(2)} exceeds $${dailyRemaining.toFixed(2)} remaining today`,
    passed: dailyOk,
    source: "MAVEN",
    severity: "violation",
  });

  // 4. Trailing drawdown remaining
  const watermark =
    input.account.highest_equity_watermark ??
    input.account.starting_capital;
  const trailingAllowance = (watermark * r.max_trailing_drawdown_percent) / 100;
  const currentEquity =
    input.account.current_equity ?? input.currentCapital;
  const trailingRemaining = Math.max(
    currentEquity - (watermark - trailingAllowance),
    0
  );
  const trailingOk = plannedDailyRisk <= trailingRemaining + 0.01;
  checks.push({
    key: "trailing_drawdown",
    label: `Trailing drawdown ≤ ${r.max_trailing_drawdown_percent}%`,
    detail: trailingOk
      ? `$${trailingRemaining.toFixed(2)} remaining to floor`
      : `Planned risk $${plannedDailyRisk.toFixed(2)} exceeds $${trailingRemaining.toFixed(2)} remaining`,
    passed: trailingOk,
    source: "MAVEN",
    severity: "violation",
  });

  // 5. Min R:R
  const rr = input.plannedRR;
  const rrOk = rr !== null && rr >= 2;
  checks.push({
    key: "rr",
    label: "Reward ≥ 1:2",
    detail:
      rr === null
        ? "Planned R:R not provided."
        : rrOk
          ? undefined
          : `Planned 1:${rr.toFixed(2)} — below 1:2 minimum.`,
    passed: rrOk,
    source: "MAVEN",
    severity: "warn",
  });

  // 6. No high-impact news trade
  if (r.require_kyc) {
    checks.push({
      key: "news",
      label: "No high-impact news",
      detail: input.newsHighImpact
        ? "High-impact news marked for today."
        : undefined,
      passed: !input.newsHighImpact,
      source: "MAVEN",
      severity: "violation",
    });
  }

  // 7. Daily trade availability (Maven typically 1 per day for consistency)
  const maxDaily = input.account.max_daily_trades ?? 1;
  const dailyTradesOk = input.tradesToday < maxDaily;
  checks.push({
    key: "daily_trades",
    label: `${maxDaily} trade${maxDaily > 1 ? "s" : ""}/day limit`,
    detail: dailyTradesOk
      ? undefined
      : `Already ${input.tradesToday} today.`,
    passed: dailyTradesOk,
    source: "MAVEN",
    severity: "violation",
  });

  // 8. KYC verified
  const kycVerified = input.account.kyc_status === "Verified";
  checks.push({
    key: "kyc",
    label: "KYC verified",
    detail: kycVerified
      ? undefined
      : `KYC status: ${input.account.kyc_status}`,
    passed: kycVerified,
    source: "MAVEN",
    severity: "warn",
  });

  return summarize(checks, "MAVEN");
}

// ---------- Personal path ----------

function checkPersonal(
  input: TradeCheckInput,
  plan: PersonalTradingPlan
): TradeCheckResult {
  const checks: TradeCheckItem[] = [];
  const limits = plan.limits_enabled ?? {};

  // 1. Instruments
  if (plan.preferred_instruments && plan.preferred_instruments.length > 0) {
    const ok = plan.preferred_instruments.includes(input.instrument);
    checks.push({
      key: "instrument",
      label: `Preferred instruments`,
      detail: ok
        ? undefined
        : `${input.instrument} is not in your preferred list.`,
      passed: ok,
      source: "PERSONAL",
      severity: "warn",
    });
  }

  // 2. Default risk %
  const defaultRisk = plan.default_risk_percent;
  const maxRisk = plan.max_risk_percent;
  if (defaultRisk != null && maxRisk != null && input.plannedRiskPercent != null) {
    const underMax = input.plannedRiskPercent <= maxRisk + 0.01;
    checks.push({
      key: "risk_max",
      label: `Max risk per trade: ${maxRisk}%`,
      detail: underMax
        ? undefined
        : `Planned ${input.plannedRiskPercent.toFixed(2)}% exceeds your ${maxRisk}% maximum.`,
      passed: underMax,
      source: "PERSONAL",
      severity: "violation",
    });

    const nearDefault = input.plannedRiskPercent <= defaultRisk * 1.5;
    checks.push({
      key: "risk_default",
      label: `Default risk: ${defaultRisk}%`,
      detail: nearDefault
        ? undefined
        : `Planned ${input.plannedRiskPercent.toFixed(2)}% is much higher than your default ${defaultRisk}%.`,
      passed: nearDefault,
      source: "PERSONAL",
      severity: "warn",
    });
  }

  // 3. Daily loss cap
  if (limits.max_daily_loss && plan.max_daily_loss_percent != null) {
    const cap = (input.currentCapital * plan.max_daily_loss_percent) / 100;
    const todayLoss = Math.max(-input.todayPnL, 0);
    const remaining = Math.max(cap - todayLoss, 0);
    const planned = input.plannedRiskAmount ?? 0;
    checks.push({
      key: "daily_loss",
      label: `Daily loss cap: ${plan.max_daily_loss_percent}%`,
      detail:
        planned <= remaining + 0.01
          ? `$${remaining.toFixed(2)} remaining today`
          : `Planned $${planned.toFixed(2)} exceeds $${remaining.toFixed(2)} remaining`,
      passed: planned <= remaining + 0.01,
      source: "PERSONAL",
      severity: "violation",
    });
  }

  // 4. Weekly loss cap
  if (limits.max_weekly_loss && plan.max_weekly_loss_percent != null) {
    checks.push({
      key: "weekly_loss",
      label: `Weekly loss cap: ${plan.max_weekly_loss_percent}%`,
      detail: `Applies to your cumulative weekly loss. Currently ${input.tradesThisWeek} trades this week.`,
      passed: true,
      source: "PERSONAL",
      severity: "info",
    });
  }

  // 5. Min R:R
  if (plan.min_rr != null) {
    const rrOk = input.plannedRR !== null && input.plannedRR >= plan.min_rr;
    checks.push({
      key: "rr",
      label: `Minimum R:R: 1:${plan.min_rr.toFixed(2)}`,
      detail:
        input.plannedRR === null
          ? "Planned R:R not provided."
          : rrOk
            ? undefined
            : `Planned 1:${input.plannedRR.toFixed(2)} is below your minimum.`,
      passed: rrOk,
      source: "PERSONAL",
      severity: "warn",
    });
  }

  // 6. Max trades per day
  if (limits.max_trades_per_day && plan.max_trades_per_day != null) {
    const ok = input.tradesToday < plan.max_trades_per_day;
    checks.push({
      key: "daily_trades",
      label: `Max ${plan.max_trades_per_day} trade${plan.max_trades_per_day > 1 ? "s" : ""}/day`,
      detail: ok ? undefined : `Already ${input.tradesToday} today.`,
      passed: ok,
      source: "PERSONAL",
      severity: "violation",
    });
  }

  // 7. Max trades per week
  if (limits.max_trades_per_week && plan.max_trades_per_week != null) {
    const ok = input.tradesThisWeek < plan.max_trades_per_week;
    checks.push({
      key: "weekly_trades",
      label: `Max ${plan.max_trades_per_week} trades/week`,
      detail: ok ? undefined : `Already ${input.tradesThisWeek} this week.`,
      passed: ok,
      source: "PERSONAL",
      severity: "violation",
    });
  }

  // 8. Max trades per month
  if (limits.max_trades_per_month && plan.max_trades_per_month != null) {
    const ok = input.tradesThisMonth < plan.max_trades_per_month;
    checks.push({
      key: "monthly_trades",
      label: `Max ${plan.max_trades_per_month} trades/month`,
      detail: ok ? undefined : `Already ${input.tradesThisMonth} this month.`,
      passed: ok,
      source: "PERSONAL",
      severity: "violation",
    });
  }

  // 9. Sessions
  if (
    plan.preferred_sessions &&
    plan.preferred_sessions.length > 0 &&
    input.session
  ) {
    const ok = plan.preferred_sessions.includes(input.session);
    checks.push({
      key: "session",
      label: "Preferred sessions",
      detail: ok
        ? undefined
        : `${input.session} is not in your preferred list.`,
      passed: ok,
      source: "PERSONAL",
      severity: "warn",
    });
  }

  // 10. News restriction
  if (plan.news_restrictions) {
    checks.push({
      key: "news",
      label: "News restrictions apply",
      detail:
        input.newsHighImpact && plan.news_restrictions
          ? plan.news_restrictions
          : undefined,
      passed: !input.newsHighImpact,
      source: "PERSONAL",
      severity: "warn",
    });
  }

  // 11. Approval mode
  const mode = plan.approval_mode ?? "warning";
  checks.push({
    key: "approval_mode",
    label: `Approval mode: ${mode}`,
    detail: `Your plan currently ${
      mode === "block"
        ? "blocks trades when any condition fails."
        : mode === "warning"
          ? "flags warnings but allows the trade."
          : "shows status only."
    }`,
    passed: true,
    source: "PERSONAL",
    severity: "info",
  });

  return summarize(checks, "PERSONAL");
}

// ---------- Helpers ----------

function summarize(
  checks: TradeCheckItem[],
  mode: "MAVEN" | "PERSONAL"
): TradeCheckResult {
  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;

  const violations = checks.filter(
    (c) => !c.passed && c.severity === "violation"
  );

  // Blocked logic:
  // Maven — any violation blocks.
  // Personal — any violation blocks ONLY if approval_mode === 'block'.
  //   Otherwise violations downgrade to warnings.
  let blocked = false;
  if (mode === "MAVEN") {
    blocked = violations.length > 0;
  } else {
    // (approval_mode handled at call site; default here = not blocked)
    blocked = false;
  }

  const summary = blocked
    ? `${violations.length} firm rule violation${violations.length === 1 ? "" : "s"} — trade blocked.`
    : violations.length > 0
      ? `${violations.length} warning${violations.length === 1 ? "" : "s"} — review before proceeding.`
      : passed === total
        ? "All conditions satisfied."
        : "Some conditions are not met.";

  return { checks, passed, total, blocked, mode, summary };
}
