"use client";

import * as React from "react";
import useSWR, { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase/client";
import { listTrades } from "./trades";
import { listWithdrawals } from "./withdrawals";
import { listAnalyses } from "./analyses";
import { getWeeklyReview } from "./weekly-reviews";
import { swrKeys } from "./keys";
import type { Trade, Withdrawal, Analysis, WeeklyReview } from "@/lib/types";

// One browser client for the entire app.
const supabase = createClient();

export function useTrades(accountId: string | null) {
  return useSWR<Trade[]>(
    swrKeys.trades(accountId),
    ([, id]) => listTrades(supabase, { accountId: id as string }),
    { suspense: false }
  );
}

export function useWithdrawals(accountId: string | null) {
  return useSWR<Withdrawal[]>(
    swrKeys.withdrawals(accountId),
    ([, id]) => listWithdrawals(supabase, id as string),
    { suspense: false }
  );
}

export function useAnalyses(accountId: string | null) {
  return useSWR<Analysis[]>(
    swrKeys.analyses(accountId),
    ([, id]) => listAnalyses(supabase, { accountId: id as string }),
    { suspense: false }
  );
}

export function useWeeklyReview(
  accountId: string | null,
  weekStart: string
) {
  return useSWR<WeeklyReview | null>(
    swrKeys.weeklyReview(accountId, weekStart),
    ([, id, wk]) =>
      getWeeklyReview(supabase, id as string, wk as string),
    { suspense: false }
  );
}

/**
 * Load trades for a set of accounts (Dashboard / Analytics in All / Maven / Personal mode).
 * The key is stable — computed from a sorted list of account IDs — and only
 * re-computed when the actual set of accounts changes.
 */
export function useTradesForFilter(
  accounts: { id: string; account_type: string }[]
) {
  const idsKey = React.useMemo(() => {
    if (accounts.length === 0) return null;
    return accounts.map((a) => a.id).sort().join(",");
  }, [accounts]);

  return useSWR<Trade[]>(
    idsKey ? (["tradesFilter", idsKey] as const) : null,
    async ([, key]: readonly [string, string]) => {
      const ids = key.split(",");
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .in("account_id", ids)
        .order("trade_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Trade[];
    },
    { suspense: false }
  );
}

export function useWithdrawalsForFilter(accounts: { id: string }[]) {
  const idsKey = React.useMemo(() => {
    if (accounts.length === 0) return null;
    return accounts.map((a) => a.id).sort().join(",");
  }, [accounts]);

  return useSWR<Withdrawal[]>(
    idsKey ? (["withdrawalsFilter", idsKey] as const) : null,
    async ([, key]: readonly [string, string]) => {
      const ids = key.split(",");
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .in("account_id", ids);
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
    { suspense: false }
  );
}

/**
 * Revalidates all trade / withdrawal / analysis caches — both the
 * single-account keys AND the filter-based keys used by the Dashboard.
 * Called from JournalClient after save/edit/delete so the Dashboard
 * updates on the same tab immediately.
 */
export function useRevalidateAccount(accountId: string | null) {
  const { mutate } = useSWRConfig();

  return React.useCallback(async () => {
    // Force-revalidate every matching key: single-account AND filter-based.
    await Promise.all([
      mutate(
        (key) =>
          Array.isArray(key) &&
          ["trades", "tradesFilter", "withdrawals", "withdrawalsFilter", "analyses"].includes(
            key[0] as string
          ),
        undefined,
        { revalidate: true }
      ),
      mutate(swrKeys.trades(accountId)),
      mutate(swrKeys.withdrawals(accountId)),
      mutate(swrKeys.analyses(accountId)),
    ]);
  }, [mutate, accountId]);
}

/**
 * Realtime trade sync.
 *
 * Subscribes to INSERT / UPDATE / DELETE on `trades` filtered by the
 * authenticated user. When any event arrives:
 *   1. Invalidates every trade-related SWR cache (single-account + filter).
 *   2. Invalidates withdrawal caches too (dashboard uses withdrawals for
 *      account balance and consistency cycle). Analyses and accounts refresh
 *      on navigation, which is fine.
 *
 * The subscription is created once per user and torn down on unmount /
 * user change. Reconnect is handled by supabase-js internally — when the
 * socket drops and returns, we re-fetch to catch anything missed.
 *
 * Call this once (e.g. in AppShell). It is a no-op when userId is null.
 */
export function useRealtimeTradesSync(userId: string | null) {
  const { mutate } = useSWRConfig();

  React.useEffect(() => {
    if (!userId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const invalidateAll = () => {
      void mutate(
        (key) =>
          Array.isArray(key) &&
          ["trades", "tradesFilter", "withdrawals", "withdrawalsFilter"].includes(
            key[0] as string
          ),
        undefined,
        { revalidate: true }
      );
    };

    // Ensure the socket is subscribed before we create the channel —
    // otherwise events fired during the initial connect can be missed.
    (async () => {
      try {
        await supabase.realtime.setAuth();
      } catch {
        // Not fatal — some environments set auth automatically.
      }
      if (cancelled) return;

      channel = supabase
        .channel(`trades-realtime-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*", // INSERT | UPDATE | DELETE
            schema: "public",
            table: "trades",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            invalidateAll();
          }
        )
        .subscribe((status) => {
          // After a reconnect the socket replays events, but if any were
          // missed during the outage we want a full refetch too.
          if (status === "SUBSCRIBED") {
            invalidateAll();
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, mutate]);
}
