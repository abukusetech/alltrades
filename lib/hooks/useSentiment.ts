"use client";

import * as React from "react";

export interface SentimentResponse {
  goldFng: {
    value: number;
    classification: string;
    timestamp: string;
  } | null;
  fngHistory: {
    value: number;
    classification: string;
    timestamp: string;
  }[];
  eurCot: null | {
    reportDate: string;
    longPositions: number;
    shortPositions: number;
    netPositions: number;
    changeFromPrevious: number | null;
  };
  goldCot: null | {
    reportDate: string;
    longPositions: number;
    shortPositions: number;
    netPositions: number;
    changeFromPrevious: number | null;
  };
  cotStatus: "available" | "unavailable";
  cotReason: string | null;
}

export function useSentiment() {
  const [data, setData] = React.useState<SentimentResponse | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/market/sentiment");
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || "Failed");
        
        if (mounted) {
          setData(json);
          setStatus("ready");
        }
      } catch (err) {
        if (mounted) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    void load();
    const id = setInterval(load, 60 * 60 * 1000); // refresh 1hr
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return { data, status, errorMessage };
}

