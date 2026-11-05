// ALLTRADES — Position sizing math (EURUSD + XAUUSD)
//
// Pure functions. No side effects.
//
// EURUSD: standard FX convention — pip = 0.0001, $10 / pip / 1.00 lot.
// XAUUSD: reads verified specs from account.maven_rules.xauusd_specs.
//         Tick-based math: monetary loss per lot = (SL distance / tick_size) × tick_value_usd.
//         No pips, no generic broker assumptions.
//
// If XAUUSD specs are missing, returns incomplete with a clear reason.
// Never invents values.

import type { Account } from "@/lib/types";

export interface XauusdSpecs {
  contract_size: number;
  tick_size: number;
  tick_value_usd: number;
  digits: number;
  min_lot: number;
  lot_step: number;
}

export interface PositionInput {
  instrument: string;
  direction: "BUY" | "SELL" | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskPercent: number;
  balance: number;
  account: Account | null;
}

export interface PositionResult {
  complete: boolean;
  reason: string | null;
  slDistance: number | null;
  tpDistance: number | null;
  riskAmount: number | null;
  potentialProfit: number | null;
  rr: number | null;
  lotSize: number | null;
  instrument: string;
}

function round(value: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

function readXauusdSpecs(account: Account | null): XauusdSpecs | null {
  if (!account) return null;
  const rules = account.maven_rules as Record<string, unknown> | null;
  if (!rules) return null;
  const raw = rules["xauusd_specs"];
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const cs = Number(s.contract_size);
  const ts = Number(s.tick_size);
  const tv = Number(s.tick_value_usd);
  const dg = Number(s.digits);
  const ml = Number(s.min_lot);
  const ls = Number(s.lot_step);
  if (!Number.isFinite(cs) || cs <= 0) return null;
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (!Number.isFinite(tv) || tv <= 0) return null;
  return {
    contract_size: cs,
    tick_size: ts,
    tick_value_usd: tv,
    digits: Number.isFinite(dg) && dg > 0 ? dg : 2,
    min_lot: Number.isFinite(ml) && ml > 0 ? ml : 0.01,
    lot_step: Number.isFinite(ls) && ls > 0 ? ls : 0.01,
  };
}

function floorToStep(value: number, step: number, min: number): number {
  if (step <= 0) return Math.max(min, value);
  const steps = Math.floor(value / step);
  const rounded = steps * step;
  // avoid floating point drift: re-round to 8 decimal places
  const clean = Math.round(rounded * 1e8) / 1e8;
  return Math.max(min, clean);
}

const EMPTY: Omit<PositionResult, "instrument"> = {
  complete: false,
  reason: null,
  slDistance: null,
  tpDistance: null,
  riskAmount: null,
  potentialProfit: null,
  rr: null,
  lotSize: null,
};

export function computePosition(input: PositionInput): PositionResult {
  const {
    instrument,
    direction,
    entry,
    stopLoss,
    takeProfit,
    riskPercent,
    balance,
    account,
  } = input;

  const sym =
    instrument === "XAUUSD" || instrument === "XAUUSD / Gold" ? "XAUUSD" : "EURUSD";

  if (!direction) return { ...EMPTY, instrument: sym, reason: "Select BUY or SELL" };
  if (entry === null || entry <= 0)
    return { ...EMPTY, instrument: sym, reason: "Enter a valid entry price" };
  if (stopLoss === null || stopLoss <= 0)
    return { ...EMPTY, instrument: sym, reason: "Enter a valid stop loss" };
  if (takeProfit === null || takeProfit <= 0)
    return { ...EMPTY, instrument: sym, reason: "Enter a valid take profit" };
  if (riskPercent <= 0)
    return { ...EMPTY, instrument: sym, reason: "Enter a risk percentage" };
  if (balance <= 0)
    return { ...EMPTY, instrument: sym, reason: "Account balance is zero" };

  if (direction === "BUY") {
    if (stopLoss >= entry)
      return { ...EMPTY, instrument: sym, reason: "BUY: stop loss must be below entry" };
    if (takeProfit <= entry)
      return { ...EMPTY, instrument: sym, reason: "BUY: take profit must be above entry" };
  } else {
    if (stopLoss <= entry)
      return { ...EMPTY, instrument: sym, reason: "SELL: stop loss must be above entry" };
    if (takeProfit >= entry)
      return { ...EMPTY, instrument: sym, reason: "SELL: take profit must be below entry" };
  }

  const riskAmount = round((balance * riskPercent) / 100, 2);
  const slDistanceRaw = Math.abs(entry - stopLoss);
  const tpDistanceRaw = Math.abs(takeProfit - entry);
  const slDistance = round(slDistanceRaw, 5);
  const tpDistance = round(tpDistanceRaw, 5);
  const rr = round(tpDistanceRaw / slDistanceRaw, 2);

  // ---- EURUSD ----
  if (sym === "EURUSD") {
    const PIP = 0.0001;
    const slPips = slDistanceRaw / PIP;
    const tpPips = tpDistanceRaw / PIP;
    const pipValuePerLot = 10;
    const lossPerLot = slPips * pipValuePerLot;
    if (lossPerLot <= 0)
      return { ...EMPTY, instrument: sym, reason: "Cannot compute lot size (SL too small)" };
    const rawLot = riskAmount / lossPerLot;
    const lotSize = floorToStep(rawLot, 0.01, 0.01);
    const potentialProfit = round(lotSize * tpPips * pipValuePerLot, 2);
    return {
      complete: true,
      reason: null,
      slDistance,
      tpDistance,
      riskAmount,
      potentialProfit,
      rr,
      lotSize,
      instrument: sym,
    };
  }

  // ---- XAUUSD ----
  const specs = readXauusdSpecs(account);
  if (!specs) {
    return {
      ...EMPTY,
      instrument: sym,
      reason:
        "XAUUSD specifications not loaded — run the Maven spec seed SQL once in Supabase (see setup notes)",
    };
  }

  // Tick-based math
  const slTicks = slDistanceRaw / specs.tick_size;
  const tpTicks = tpDistanceRaw / specs.tick_size;
  const lossPerLot = slTicks * specs.tick_value_usd;
  const profitPerLot = tpTicks * specs.tick_value_usd;
  if (lossPerLot <= 0)
    return { ...EMPTY, instrument: sym, reason: "Cannot compute lot size (SL too small)" };

  const rawLot = riskAmount / lossPerLot;
  const lotSize = floorToStep(rawLot, specs.lot_step, specs.min_lot);
  if (lotSize < specs.min_lot) {
    return {
      ...EMPTY,
      instrument: sym,
      reason: `Risk too small for minimum lot ${specs.min_lot} at this SL — position would be ${rawLot.toFixed(4)} lots`,
    };
  }

  const potentialProfit = round(lotSize * profitPerLot, 2);
  return {
    complete: true,
    reason: null,
    slDistance,
    tpDistance,
    riskAmount,
    potentialProfit,
    rr,
    lotSize,
    instrument: sym,
  };
}
