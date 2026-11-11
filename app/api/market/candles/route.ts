import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Simple in-memory cache to avoid hitting TwelveData on every request
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "EUR/USD";
  const interval = searchParams.get("interval") || "15min";
  const outputsize = searchParams.get("outputsize") || "100";

  const apiKey = process.env.TWELVEDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "MARKET DATA UNAVAILABLE: TwelveData API key is not configured." },
      { status: 500 }
    );
  }

  const cacheKey = `${symbol}:${interval}:${outputsize}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
      symbol
    )}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "error") {
      if (cached) {
        return NextResponse.json({ ...cached.data, stale: true, warning: `TwelveData refresh failed: ${data.message}` });
      }
      return NextResponse.json(
        { error: `TwelveData Error: ${data.message}` },
        { status: 502 }
      );
    }

    if (!Array.isArray(data.values) || data.values.length === 0) {
      if (cached) return NextResponse.json({ ...cached.data, stale: true, warning: "Provider returned no candles; showing last cached data." });
      return NextResponse.json({ error: "TwelveData returned no candle values for this symbol and timeframe." }, { status: 502 });
    }

    const response = { values: data.values, stale: false };
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (error) {
    // If the fetch fails but we have a stale cache, return it so the user sees data
    if (cached) {
      return NextResponse.json(cached.data);
    }
    return NextResponse.json(
      { error: "Failed to connect to TwelveData" },
      { status: 500 }
    );
  }
}
