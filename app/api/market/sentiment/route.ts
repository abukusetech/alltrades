import { NextResponse } from "next/server";

export const runtime = "nodejs";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export async function GET() {
  const cacheKey = "sentiment_v4";
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Gold Fear & Greed
    const fngRes = await fetch("https://api.alternative.me/fng/?limit=30");
    const fngData = await fngRes.json();
    const fngHistory = Array.isArray(fngData?.data) ? fngData.data.map((item: any) => ({
      value: parseInt(item.value, 10),
      classification: item.value_classification,
      timestamp: new Date(parseInt(item.timestamp, 10) * 1000).toISOString(),
    })) : [];
    const currentFng = fngHistory[0] || null;

    // 2. CFTC COT Data — query by contract codes to be accurate
    // Fetch recent 500 rows so we definitely capture both contracts
    const cotRes = await fetch(
      "https://publicreporting.cftc.gov/resource/6dca-aqww.json?$limit=500&$order=report_date_as_yyyy_mm_dd%20DESC",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    
    if (!cotRes.ok) {
      throw new Error(`CFTC API responded with ${cotRes.status}`);
    }
    
    const cotData = await cotRes.json();
    
    if (!Array.isArray(cotData)) {
      throw new Error("CFTC API did not return an array");
    }

    let eurCot = null;
    let goldCot = null;

    // Filter by exact market codes
    const eurReports = cotData.filter((r: any) => r.cftc_contract_market_code === "099741");
    const goldReports = cotData.filter((r: any) => r.cftc_contract_market_code === "088691");

    if (eurReports.length > 0) {
      const cur = eurReports[0];
      const prev = eurReports.length > 1 ? eurReports[1] : null;
      const long = parseInt(cur.noncomm_positions_long_all, 10);
      const short = parseInt(cur.noncomm_positions_short_all, 10);
      const net = long - short;
      const prevNet = prev ? (parseInt(prev.noncomm_positions_long_all, 10) - parseInt(prev.noncomm_positions_short_all, 10)) : null;

      eurCot = {
        reportDate: cur.report_date_as_yyyy_mm_dd.split("T")[0],
        longPositions: long,
        shortPositions: short,
        netPositions: net,
        changeFromPrevious: prevNet !== null ? net - prevNet : null,
      };
    }

    if (goldReports.length > 0) {
      const cur = goldReports[0];
      const prev = goldReports.length > 1 ? goldReports[1] : null;
      const long = parseInt(cur.noncomm_positions_long_all, 10);
      const short = parseInt(cur.noncomm_positions_short_all, 10);
      const net = long - short;
      const prevNet = prev ? (parseInt(prev.noncomm_positions_long_all, 10) - parseInt(prev.noncomm_positions_short_all, 10)) : null;

      goldCot = {
        reportDate: cur.report_date_as_yyyy_mm_dd.split("T")[0],
        longPositions: long,
        shortPositions: short,
        netPositions: net,
        changeFromPrevious: prevNet !== null ? net - prevNet : null,
      };
    }

    const response = {
      goldFng: currentFng,
      fngHistory,
      eurCot,
      goldCot,
      debug: {
        totalRowsReturned: cotData.length,
        uniqueCodes: [...new Set(cotData.map((r: any) => r.cftc_contract_market_code))].slice(0, 10),
      }
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Sentiment API error:", error.message);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: "Failed to fetch sentiment data", message: error.message },
      { status: 500 }
    );
  }
}
