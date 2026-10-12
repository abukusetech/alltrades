// ALLTRADES — Type-aware position sizing
//
// Uses getMavenRules() for Maven accounts and getPersonalRules() for
// personal accounts. Never mixes the two.

import type { Account } from "@/lib/types";
import { getMavenRules, getPersonalRules } from "./rules";

export interface PositionInput {
  account: Account;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskPercentOverride?: number | null;
  instrument: string;
}

export interface PositionOutput {
  source: "MAVEN" | "PERSONAL" | "UNCLASSIFIED";
  currency: string;

  riskAmount: number | null;
  riskPercentUsed: number | null;
  slPips: number | null;
  tpPips: number | null;
  rr: number | null;

  lots: number | null;
  potentialProfit: number | null;
  potentialReturnPercent: number | null;

  /** Any warnings the calculator needs to surface. */
  warnings: string[];
  /** True when enough info was provided to compute all values. */
  complete: boolean;

  /** Maven-only limits for display. Null in personal mode. */
  mavenDailyLossLimit: number | null;
  mavenMaxDrawdownLimit: number | null;
  mavenConsistencyRequirement: number | null;
  mavenProfitSplit: number | null;

  /** Personal-only limits for display. Null in Maven mode. */
  personalDailyLossLimit: number | null;
  personalMaxDrawdownLimit: number | null;
}

function pipSize(instrument: string): number {
  if (instrument === "USDJPY" || instrument === "GBPJPY") return 0.01;
  if (instrument === "XAUUSD / Gold") return 0.1;
  if (
    instrument === "NAS100" ||
    instrument === "US30" ||
    instrument === "SPX500"
  )
    return 1;
  return 0.0001;
}

function pipValuePerStandardLot(instrument: string): number {
  if (instrument === "USDJPY" || instrument === "GBPJPY") return 9.1;
  if (instrument === "XAUUSD / Gold") return 10;
  if (
    instrument === "NAS100" ||
    instrument === "US30" ||
    instrument === "SPX500"
  )
    return 1;
  return 10;
}

export function computePositionForAccount(
  input: PositionInput
): PositionOutput {
  const { account, entry, stopLoss, takeProfit, instrument } = input;
  const warnings: string[] = [];

  const type = account.account_type;
  const currency = account.account_currency || "USD";
  const startingCapital = Number(account.starting_capital) || 0;

  // ---- Resolve rules by type ----
  let defaultRiskPercent: number | null = null;
  let mavenDailyLossLimit: number | null = null;
  let mavenMaxDrawdownLimit: number | null = null;
  let mavenConsistencyRequirement: number | null = null;
  let mavenProfitSplit: number | null = null;
  let personalDailyLossLimit: number | null = null;
  let personalMaxDrawdownLimit: number | null = null;

  if (type === "MAVEN") {
    const r = getMavenRules(account);
    defaultRiskPercent = r.maxRiskPerTradePercent ?? null;
    mavenDailyLossLimit =
      r.dailyLossPercent !== null
        ? (startingCapital * r.dailyLossPercent) / 100
        : null;
    mavenMaxDrawdownLimit =
      r.maxDrawdownPercent !== null
        ? (startingCapital * r.maxDrawdownPercent) / 100
        : null;
    mavenConsistencyRequirement = r.maxConsistencyPercent;
    mavenProfitSplit = r.profitSplitPercent;

    if (defaultRiskPercent === null) {
      warnings.push(
        "This Maven account has no max risk per trade configured. Using default 0.25%."
      );
      defaultRiskPercent = 0.25;
    }
  } else if (type === "PERSONAL") {
    const r = getPersonalRules(account);
    defaultRiskPercent = r.riskPercentPerTrade ?? null;
    personalDailyLossLimit =
      r.dailyLossPercent !== null
        ? (startingCapital * r.dailyLossPercent) / 100
        : null;
    personalMaxDrawdownLimit =
      r.maxDrawdownPercent !== null
        ? (startingCapital * r.maxDrawdownPercent) / 100
        : null;

    if (defaultRiskPercent === null) {
      warnings.push(
        "This personal account has no risk-per-trade configured. Using default 0.5%."
      );
      defaultRiskPercent = 0.5;
    }
  } else {
    warnings.push(
      "This account is not classified as Maven or Personal. Set its type in Settings for correct risk calculations."
    );
  }

  const riskPercentUsed =
    input.riskPercentOverride ?? defaultRiskPercent ?? 0.25;

  // ---- Compute pips ----
  let slPips: number | null = null;
  let tpPips: number | null = null;
  let rr: number | null = null;

  if (entry !== null && stopLoss !== null) {
    const raw = Math.abs(entry - stopLoss) / pipSize(instrument);
    if (Number.isFinite(raw)) slPips = Number(raw.toFixed(1));
  }
  if (entry !== null && takeProfit !== null) {
    const raw = Math.abs(takeProfit - entry) / pipSize(instrument);
    if (Number.isFinite(raw)) tpPips = Number(raw.toFixed(1));
  }
  if (slPips && tpPips && slPips > 0) {
    rr = Number((tpPips / slPips).toFixed(2));
  }

  // ---- Compute risk amount ----
  const riskAmount = Number(
    ((startingCapital * riskPercentUsed) / 100).toFixed(2)
  );

  // ---- Compute lots if we have SL pips ----
  let lots: number | null = null;
  let potentialProfit: number | null = null;
  let potentialReturnPercent: number | null = null;

  if (slPips !== null && slPips > 0) {
    const pipValue = pipValuePerStandardLot(instrument);
    const rawLots = riskAmount / (slPips * pipValue);
    if (Number.isFinite(rawLots)) {
      lots = Math.max(0.01, Math.floor(rawLots * 100) / 100);
    }
    if (rr !== null) {
      potentialProfit = Number((riskAmount * rr).toFixed(2));
      potentialReturnPercent =
        startingCapital > 0
          ? Number(((potentialProfit / startingCapital) * 100).toFixed(2))
          : null;
    }
  }

  // ---- Warnings ----
  if (type === "MAVEN" && mavenDailyLossLimit !== null) {
    if (riskAmount > mavenDailyLossLimit) {
      warnings.push(
        `Risk ($${riskAmount.toFixed(2)}) exceeds the Maven daily loss limit ($${mavenDailyLossLimit.toFixed(2)}).`
      );
    }
  }
  if (type === "PERSONAL" && personalDailyLossLimit !== null) {
    if (riskAmount > personalDailyLossLimit) {
      warnings.push(
        `Risk ($${riskAmount.toFixed(2)}) exceeds your personal daily loss limit ($${personalDailyLossLimit.toFixed(2)}).`
      );
    }
  }
  if (rr !== null && rr < 2) {
    warnings.push(
      `Risk/reward is 1:${rr.toFixed(2)} — below the 1:2 minimum.`
    );
  }
  if (slPips !== null && (slPips < 10 || slPips > 15)) {
    warnings.push(
      `SL is ${slPips.toFixed(1)} pips — outside the 10–15 pip range.`
    );
  }

  const complete =
    entry !== null && stopLoss !== null && takeProfit !== null && slPips !== null;

  return {
    source: type === "MAVEN" ? "MAVEN" : type === "PERSONAL" ? "PERSONAL" : "UNCLASSIFIED",
    currency,
    riskAmount,
    riskPercentUsed,
    slPips,
    tpPips,
    rr,
    lots,
    potentialProfit,
    potentialReturnPercent,
    warnings,
    complete,
    mavenDailyLossLimit,
    mavenMaxDrawdownLimit,
    mavenConsistencyRequirement,
    mavenProfitSplit,
    personalDailyLossLimit,
    personalMaxDrawdownLimit,
  };
}
