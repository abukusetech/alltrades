// ALLTRADES — Volatility classification engine
// Pure math. Uses real OHLC candles. Never fabricates values.

export type VolatilityClass = "LOW" | "NORMAL" | "HIGH" | "EXTREME" | "UNAVAILABLE";

export interface VolatilityResult {
  atr: number | null;
  atrPercent: number | null;         // ATR as % of current price
  relativeToAverage: number | null;  // ATR / 20-period average ATR
  classification: VolatilityClass;
  reason: string | null;
}

export interface Candle {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Calculate ATR (Average True Range) from candles.
 * Uses the simple moving average of True Range (Wilder's method alternative).
 */
export function calculateATR(candles: Candle[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  // Simple average of last N true ranges
  const recent = trueRanges.slice(-period);
  const sum = recent.reduce((s, v) => s + v, 0);
  return Number((sum / period).toFixed(6));
}

/**
 * Classify volatility by comparing current ATR to the historical average ATR.
 * Uses instrument-aware thresholds.
 */
export function classifyVolatility(
  candles: Candle[],
  instrument: string
): VolatilityResult {
  if (candles.length < 48) {
    return {
      atr: null,
      atrPercent: null,
      relativeToAverage: null,
      classification: "UNAVAILABLE",
      reason: "Insufficient candle data (need at least 48 candles for ATR and 20 historical readings)",
    };
  }

  const period = 14;
  const currentATR = calculateATR(candles, period);
  const historicalSamples: number[] = [];
  for (let end = candles.length - period - 1; end >= period && historicalSamples.length < 20; end--) {
    const sample = calculateATR(candles.slice(0, end + 1), period);
    if (sample !== null && Number.isFinite(sample)) historicalSamples.push(sample);
  }
  const historicalATR = historicalSamples.length === 20
    ? historicalSamples.reduce((sum, value) => sum + value, 0) / historicalSamples.length
    : null;
  const currentPrice = candles[candles.length - 1].close;

  if (currentATR === null || historicalATR === null || currentPrice <= 0) {
    return {
      atr: null,
      atrPercent: null,
      relativeToAverage: null,
      classification: "UNAVAILABLE",
      reason: "Could not calculate ATR or its 20-sample historical average (invalid or insufficient prices)",
    };
  }

  const relative = currentATR / historicalATR;
  const atrPercent = (currentATR / currentPrice) * 100;

  // Instrument-specific thresholds (relative to their own average, not raw ATR)
  let classification: VolatilityClass;
  let reason: string;

  if (relative < 0.7) {
    classification = "LOW";
    reason = `ATR is ${(relative * 100).toFixed(0)}% of its historical average — market is consolidating.`;
  } else if (relative < 1.3) {
    classification = "NORMAL";
    reason = `ATR is ${(relative * 100).toFixed(0)}% of its historical average — within typical range.`;
  } else if (relative < 2.0) {
    classification = "HIGH";
    reason = `ATR is ${(relative * 100).toFixed(0)}% of its historical average — elevated volatility.`;
  } else {
    classification = "EXTREME";
    reason = `ATR is ${(relative * 100).toFixed(0)}% of its historical average — unusually aggressive.`;
  }

  return {
    atr: Number(currentATR.toFixed(instrument === "XAUUSD" ? 2 : 5)),
    atrPercent: Number(atrPercent.toFixed(3)),
    relativeToAverage: Number(relative.toFixed(2)),
    classification,
    reason,
  };
}
