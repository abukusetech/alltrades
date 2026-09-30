"use client";

import * as React from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import {
  getDailyAnalysis,
  listDailyAnalyses,
} from "./daily-analyses";
import type { DailyAnalysis } from "@/lib/types";

const supabase = createClient();

export function useDailyAnalysis(
  accountId: string | null,
  date: string
) {
  const key = accountId ? (["dailyAnalysis", accountId, date] as const) : null;
  return useSWR<DailyAnalysis | null>(
    key,
    ([, accId, d]) => getDailyAnalysis(supabase, accId as string, d as string),
    { revalidateOnFocus: false }
  );
}

export function useDailyAnalysesHistory(accountId: string | null, limit = 60) {
  const key = accountId
    ? (["dailyAnalysesHistory", accountId, limit] as const)
    : null;
  return useSWR<DailyAnalysis[]>(
    key,
    ([, accId, l]) =>
      listDailyAnalyses(supabase, accId as string, l as number),
    { revalidateOnFocus: false }
  );
}

/**
 * Debounced autosave hook. Takes an object (or null) and writes it
 * to Supabase after `delay` ms of inactivity.
 */
export function useAutosave<T>(
  analysis: { accountId: string; date: string } | null,
  value: T | null,
  saveFn: (payload: T) => Promise<void>,
  delay = 1200
) {
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const timerRef = React.useRef<number | null>(null);
  const lastSavedRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!analysis || value === null) return;

    const serialized = JSON.stringify(value);
    if (serialized === lastSavedRef.current) {
      return; // Nothing changed
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setState("saving");

    timerRef.current = window.setTimeout(async () => {
      try {
        await saveFn(value);
        lastSavedRef.current = serialized;
        setState("saved");
      } catch {
        setState("error");
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [analysis, value, saveFn, delay]);

  const markSaved = React.useCallback((payload: T) => {
    lastSavedRef.current = JSON.stringify(payload);
    setState("saved");
  }, []);

  return { state, markSaved };
}
