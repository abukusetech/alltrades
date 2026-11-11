"use client";

import * as React from "react";
import { classifyVolatility, type Candle, type VolatilityResult } from "@/lib/volatility";
import { getGlobalMarketStatus } from "@/lib/market-engine";

export interface VolatilityData {
  symbol: string;
  interval: string;
  result: VolatilityResult;
  lastUpdated: string | null;
  providerStatus: "loading" | "ready" | "error" | "closed";
  errorMessage: string | null;
  warning: string | null;
}

export function useVolatility(symbol: "EURUSD" | "XAUUSD", interval = "15min"): VolatilityData {
  const [data, setData] = React.useState<VolatilityData>({
    symbol,
    interval,
    result: {
      atr: null,
      atrPercent: null,
      relativeToAverage: null,
      classification: "UNAVAILABLE",
      reason: null,
    },
    lastUpdated: null,
    providerStatus: "loading",
    errorMessage: null,
    warning: null,
  });

  React.useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // 1. Use the Central Market Engine
        const now = new Date();
        const market = getGlobalMarketStatus(now);
        
        if (!market.isOpen) {
          if (mounted) {
            setData({
              symbol,
              interval,
              result: {
                atr: null,
                atrPercent: null,
                relativeToAverage: null,
                classification: "UNAVAILABLE",
                reason: "Market is closed for the weekend.",
              },
              lastUpdated: null,
              providerStatus: "closed",
              errorMessage: null,
              warning: null,
            });
          }
          return;
        }

        // 2. If market is open, fetch the data
        const apiSymbol = symbol === "XAUUSD" ? "XAU/USD" : "EUR/USD";
        const res = await fetch(
          `/api/market/candles?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}&outputsize=100`
        );

        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || `Market data provider returned HTTP ${res.status}`);
        }

        const candles: Candle[] = (json.values || []).map((c: any) => ({
          datetime: c.datetime,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
        })).filter((c: Candle) =>
          Number.isFinite(c.open) && Number.isFinite(c.high) &&
          Number.isFinite(c.low) && Number.isFinite(c.close) &&
          c.high >= c.low && c.close > 0
        );

        // TwelveData returns newest first — reverse to oldest first for ATR calc
        const ordered = candles.slice().reverse();

        if (!mounted) return;

        const result = classifyVolatility(ordered, symbol);

        setData({
          symbol,
          interval,
          result,
          lastUpdated: json.cachedAt ?? new Date().toISOString(),
          providerStatus: "ready",
          errorMessage: null,
          warning: typeof json.warning === "string" ? json.warning : null,
        });
      } catch (err) {
        if (!mounted) return;
        setData((prev) => ({
          ...prev,
          providerStatus: "error",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
          result: {
            atr: null,
            atrPercent: null,
            relativeToAverage: null,
            classification: "UNAVAILABLE",
            reason: "Market data unavailable",
          },
        }));
      }
    }

    void fetchData();
    const id = setInterval(fetchData, 60000); // Refresh every 60s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [symbol, interval]);

  return data;
}

