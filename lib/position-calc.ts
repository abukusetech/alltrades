// ALLTRADES — Position size calculator
// Uses pip value conventions for the common instruments.

export interface PositionInput {
  accountSize: number;
  riskPercent: number;   // e.g. 0.25 for 0.25%
  stopLossPips: number;  // e.g. 12
  rr: number;            // e.g. 2 for 1:2
  instrument: string;    // "EURUSD", "XAUUSD / Gold", "NAS100", "US30", "SPX500", ...
  // Optional override — if known, use this pip value directly.
  pipValuePerStandardLot?: number;
}

export interface PositionResult {
  riskAmount: number;
  perPipValue: number;
  lots: number;
  lotsRounded: number;
  takeProfitPips: number;
  potentialProfit: number;
  potentialReturnPercent: number;
  approved: boolean;
  reason: string;
}

// Default pip value per 1.0 standard lot, in USD.
// These are approximations used for planning — actual broker values may differ.
const DEFAULT_PIP_VALUE: Record<string, number> = {
  EURUSD: 10,
  GBPUSD: 10,
  AUDUSD: 10,
  USDCAD: 10,
  USDCHF: 10,
  USDJPY: 9.1, // pip is 0.01
  GBPJPY: 9.1,
  "XAUUSD / Gold": 10, // 1 pip = $0.10 per 0.01 lot; per 1.0 lot = $10 per 1 cent move
  NAS100: 1,   // varies heavily — user should override
  US30: 1,
  SPX500: 1,
  Other: 10,
};

export function pipValueFor(instrument: string): number {
  return DEFAULT_PIP_VALUE[instrument] ?? 10;
}

export function computePosition(input: PositionInput): PositionResult {
  const { accountSize, riskPercent, stopLossPips, rr, instrument } = input;

  const riskAmount = (accountSize * riskPercent) / 100;
  const perPip = input.pipValuePerStandardLot ?? pipValueFor(instrument);

  if (
    riskAmount <= 0 ||
    stopLossPips <= 0 ||
    perPip <= 0 ||
    !Number.isFinite(riskAmount)
  ) {
    return {
      riskAmount,
      perPipValue: perPip,
      lots: 0,
      lotsRounded: 0,
      takeProfitPips: 0,
      potentialProfit: 0,
      potentialReturnPercent: 0,
      approved: false,
      reason: "Invalid inputs.",
    };
  }

  // Standard formula: lots = riskAmount / (stopLossPips * pipValuePerLot)
  const lots = riskAmount / (stopLossPips * perPip);
  const lotsRounded = Math.max(0.01, Math.floor(lots * 100) / 100);

  const takeProfitPips = stopLossPips * rr;
  const potentialProfit = riskAmount * rr;
  const potentialReturnPercent = accountSize > 0 ? (potentialProfit / accountSize) * 100 : 0;

  // Approval: risk within 0.5% and RR ≥ 2 and lots ≥ 0.01
  const approved =
    riskPercent <= 0.5 && rr >= 2 && lotsRounded >= 0.01 && potentialReturnPercent <= 1.0;

  const reason = approved
    ? "Risk approved."
    : riskPercent > 0.5
      ? `Risk too high (${riskPercent}% > 0.50%).`
      : rr < 2
        ? `RR too low (1:${rr} < 1:2).`
        : lotsRounded < 0.01
          ? "Position below minimum lot size."
          : "Risk approved.";

  return {
    riskAmount,
    perPipValue: perPip,
    lots,
    lotsRounded,
    takeProfitPips,
    potentialProfit,
    potentialReturnPercent,
    approved,
    reason,
  };
}
