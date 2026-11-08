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
  date: string,
  instrument: string = "EURUSD"
) {
  const key = accountId
    ? (["dailyAnalysis", accountId, date, instrument] as const)
    : null;
  return useSWR<DailyAnalysis | null>(
    key,
    ([, accId, d, inst]) =>
      getDailyAnalysis(supabase, accId as string, d as string, inst as string),
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      // CRITICAL: Do NOT keep previous data when switching instruments.
      // We want the UI to clear instantly so the user knows they
      // are looking at a new record.
      keepPreviousData: false, 
      dedupingInterval: 2000,
      errorRetryCount: 2,
      errorRetryInterval: 2000,
    }
  );
}

export function useDailyAnalysesHistory(accountId: string | null, limit = 60) {
  // We intentionally do NOT include the instrument in the key or the fetch.
  // The history list should show every saved analysis for this account,
  // regardless of which instrument is currently selected in the UI.
  const key = accountId
    ? (["dailyAnalysesHistory", accountId, limit] as const)
    : null;
  return useSWR<DailyAnalysis[]>(
    key,
    ([, accId, l]) =>
      listDailyAnalyses(supabase, accId as string, l as number),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      keepPreviousData: true,
      dedupingInterval: 5000,
    }
  );
}

/**
 * Revision-aware autosave — unchanged from before.
 */
export function useAutosave<T>(
  deps: unknown[],
  value: T | null,
  saveFn: (payload: T) => Promise<void>,
  options?: { delay?: number; enabled?: boolean }
) {
  const delay = options?.delay ?? 1200;
  const enabled = options?.enabled ?? true;

  const [state, setState] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  const timerRef = React.useRef<number | null>(null);
  const localRevisionRef = React.useRef(0);
  const savedRevisionRef = React.useRef(0);
  const latestValueRef = React.useRef<T | null>(value);

  React.useEffect(() => {
    latestValueRef.current = value;
    localRevisionRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(() => {
    if (!enabled || value === null) return;
    if (savedRevisionRef.current >= localRevisionRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    setState("saving");
    setError(null);

    const myRevision = localRevisionRef.current;

    timerRef.current = window.setTimeout(async () => {
      try {
        const payload = latestValueRef.current;
        if (payload === null) return;

        await saveFn(payload);

        savedRevisionRef.current = myRevision;

        if (localRevisionRef.current <= myRevision) {
          setState("saved");
        } else {
          setState("saving");
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            setState("saving");
          }, 50);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
        setState("error");
      }
    }, delay);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, value === null ? "null" : "value", delay, saveFn]);

  const forceSave = React.useCallback(async () => {
    if (!enabled || latestValueRef.current === null) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setState("saving");
    setError(null);
    const myRevision = localRevisionRef.current;
    try {
      await saveFn(latestValueRef.current);
      savedRevisionRef.current = myRevision;
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setState("error");
    }
  }, [enabled, saveFn]);

  return { state, error, forceSave };
}



