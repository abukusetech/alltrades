import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, Trade, RuleCheck } from "@/lib/types";
import { pipsFromPrices } from "@/lib/daily-analysis-calc";
import { parseNumberOrNull } from "@/lib/utils";

export interface TradeRuleReport {
  checks: RuleCheck[];
  passed: number;
  total: number;
  allPass: boolean;
  percent: number;
}

/**
 * Evaluate a saved trade against the account's configured rules.
 * Every violation is computed from actual trade data — never fabricated.
 */
export function evaluateTradeRules(
  trade: Trade,
  account: Account,
  context: {
    tradesSameDay: number;
    tradesThisMonth: number;
    previousTradeWasLoss: boolean;
  }
): TradeRuleReport {
  const checks: RuleCheck[] = [];

  // Instrument
  const allowed = account.allowed_instrument ?? "EURUSD";
  checks.push({
    key: "instrument",
    label: `Instrument ${allowed}`,
    passed: trade.instrument === allowed,
    detail: trade.instrument !== allowed ? `Found ${trade.instrument}` : undefined,
  });

  // SL pips — compute from price if not provided
  const slPips =
    trade.stop_loss !== null && trade.entry_price !== null
      ? pipsFromPrices(
          Number(trade.entry_price),
          Number(trade.stop_loss),
          trade.instrument
        )
      : null;
  const minSL = account.min_sl_pips ?? 10;
  const maxSL = account.max_sl_pips ?? 15;
  checks.push({
    key: "sl_range",
    label: `SL ${minSL}–${maxSL} pips`,
    passed:
      slPips !== null &&
      Number.isFinite(slPips) &&
      slPips >= minSL &&
      slPips <= maxSL,
    detail:
      slPips !== null && (slPips < minSL || slPips > maxSL)
        ? `Found ${slPips.toFixed(1)} pips`
        : undefined,
  });

  // RR — accept "1:2", "1 : 2", "2", "1:2.14"
  const rawRR = (trade.risk_reward ?? "").replace(/\s+/g, "");
  let rrValue: number | null = null;
  if (rawRR.includes(":")) {
    const parts = rawRR.split(":");
    rrValue = parseNumberOrNull(parts[1] ?? null);
  } else {
    rrValue = parseNumberOrNull(rawRR);
  }
  const minRR = account.min_rr ?? 2;
  const rrSafe = rrValue !== null ? Number(rrValue.toFixed(2)) : null;
  const epsilon = 0.005; // 2.00 must pass even after floating point math
  checks.push({
    key: "rr",
    label: `RR ≥ 1:${minRR}`,
    passed: rrSafe !== null && rrSafe >= minRR - epsilon,
    detail:
      rrSafe !== null && rrSafe < minRR - epsilon
        ? `Found 1:${rrSafe.toFixed(2)}`
        : undefined,
  });

  // Risk % — computed from risk_amount / starting capital
  const starting = Number(account.starting_capital) || 0;
  const riskAmount = parseNumberOrNull(trade.risk_amount);
  const riskPercent =
    starting > 0 && riskAmount !== null ? (riskAmount / starting) * 100 : null;
  checks.push({
    key: "risk",
    label: "Risk ≤ 0.25%",
    passed: riskPercent !== null && riskPercent <= 0.25,
    detail:
      riskPercent !== null && riskPercent > 0.25
        ? `Found ${riskPercent.toFixed(2)}%`
        : undefined,
  });

  // News
  const forbidNews = account.forbid_high_impact_news ?? true;
  const newsLower = (trade.news_event ?? "").toLowerCase();
  const newsIsHighImpact =
    newsLower.includes("high") ||
    newsLower === "cpi" ||
    newsLower === "nfp" ||
    newsLower === "fomc" ||
    newsLower.includes("interest rate");
  checks.push({
    key: "news",
    label: "No high-impact news",
    passed: !forbidNews || !newsIsHighImpact,
    detail: forbidNews && newsIsHighImpact ? `Traded ${trade.news_event}` : undefined,
  });

  // Daily trade limit
  const maxDaily = account.max_daily_trades ?? 1;
  checks.push({
    key: "daily_trades",
    label: `${maxDaily} trade${maxDaily > 1 ? "s" : ""}/day`,
    passed: context.tradesSameDay <= maxDaily,
    detail:
      context.tradesSameDay > maxDaily
        ? `${context.tradesSameDay} trades recorded on ${trade.trade_date}`
        : undefined,
  });

  // Monthly limit
  const maxMonthly = account.max_monthly_trades ?? 12;
  checks.push({
    key: "monthly_trades",
    label: `${maxMonthly} trades/month`,
    passed: context.tradesThisMonth <= maxMonthly,
    detail:
      context.tradesThisMonth > maxMonthly
        ? `${context.tradesThisMonth} trades this month`
        : undefined,
  });

  // No risk increase after loss
  const noRiskIncrease = account.no_risk_increase_after_loss ?? true;
  if (noRiskIncrease && context.previousTradeWasLoss && riskPercent !== null) {
    checks.push({
      key: "no_risk_increase",
      label: "No risk increase after loss",
      passed: riskPercent <= 0.25,
      detail:
        riskPercent > 0.25
          ? `Risk ${riskPercent.toFixed(2)}% after a losing trade`
          : undefined,
    });
  }

  // Confirmation — implies a linked Daily Analysis exists
  const hasLinkedAnalysis = !!trade.daily_analysis_id;
  const hasConfirmationTags =
    !!trade.entry_tags &&
    trade.entry_tags.some((t) =>
      t.toLowerCase().includes("structure") || t.toLowerCase().includes("confirmation")
    );
  checks.push({
    key: "confirmation",
    label: "Confirmation recorded",
    passed: hasLinkedAnalysis || hasConfirmationTags,
    detail: !hasLinkedAnalysis && !hasConfirmationTags
      ? "No analysis link or confirmation tag"
      : undefined,
  });

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const percent = total > 0 ? Math.round((passed / total) * 100) : 100;

  return { checks, passed, total, allPass: passed === total, percent };
}

/**
 * Compute rules for a trade given all trades + the account.
 * Used when saving a trade so we can persist the result.
 */
export async function computeAndPersistRules(
  supabase: SupabaseClient,
  trade: Trade,
  account: Account,
  allTrades: Trade[]
): Promise<TradeRuleReport> {
  const tradesSameDay = allTrades.filter(
    (t) => t.trade_date === trade.trade_date
  ).length;

  const monthPrefix = trade.trade_date.slice(0, 7);
  const tradesThisMonth = allTrades.filter((t) =>
    t.trade_date.startsWith(monthPrefix)
  ).length;

  // Previous trade in the same month, ordered by date+time
  const sorted = [...allTrades]
    .filter((t) => t.trade_date.startsWith(monthPrefix) && t.id !== trade.id)
    .sort((a, b) => {
      const d = a.trade_date.localeCompare(b.trade_date);
      if (d !== 0) return d;
      return (a.trade_time ?? "").localeCompare(b.trade_time ?? "");
    });

  const previousTradeWasLoss =
    sorted.length > 0 && sorted[sorted.length - 1].result === "Loss";

  const report = evaluateTradeRules(trade, account, {
    tradesSameDay,
    tradesThisMonth,
    previousTradeWasLoss,
  });

  // Persist
  const { error } = await supabase
    .from("trades")
    .update({
      rule_compliance: report.checks,
      rule_pass_count: report.passed,
      rule_total_count: report.total,
      rule_pass: report.allPass,
    })
    .eq("id", trade.id);
  if (error) throw error;

  return report;
}



