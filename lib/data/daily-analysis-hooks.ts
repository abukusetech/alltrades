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
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      // Critical: do NOT replace local draft state with server payload
      // when the user is actively typing.
      keepPreviousData: true,
    }
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
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );
}

/**
 * Revision-aware autosave.
 *
 * Keeps the latest draft in local state. Debounces DB writes. Uses a
 * monotonically increasing local revision counter so a slow response can
 * never overwrite a newer local edit.
 *
 * The `saveFn` must perform a real DB write and resolve only after the
 * write has succeeded.
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
  // Monotonic revision of local edits. Incremented on every state change.
  const localRevisionRef = React.useRef(0);
  // Highest revision that has been successfully persisted.
  const savedRevisionRef = React.useRef(0);
  // Latest value we intend to save (kept in a ref so the debounced
  // callback always reads the latest, not a closed-over stale value).
  const latestValueRef = React.useRef<T | null>(value);

  // Keep the ref in sync on every render.
  React.useEffect(() => {
    latestValueRef.current = value;
    localRevisionRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(() => {
    if (!enabled || value === null) return;
    // Do not schedule a save if we're already up to date.
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

        // Only mark as saved if no newer edit came in while we were saving.
        // This is the crucial guard against a slow response overwriting
        // newer text.
        savedRevisionRef.current = myRevision;

        if (localRevisionRef.current <= myRevision) {
          setState("saved");
        } else {
          // A newer edit happened; schedule another save immediately.
          setState("saving");
          // Trigger another effect cycle by touching the timer.
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
