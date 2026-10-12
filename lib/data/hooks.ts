"use client";

import * as React from "react";
import useSWR from "swr";
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
  // Stable dependency: only changes when the actual set of IDs changes.
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
 * Revalidates all account-scoped data.
 */
export function useRevalidateAccount(accountId: string | null) {
  const { mutate: mTrades } = useSWR(swrKeys.trades(accountId));
  const { mutate: mWithdrawals } = useSWR(swrKeys.withdrawals(accountId));
  const { mutate: mAnalyses } = useSWR(swrKeys.analyses(accountId));

  return React.useCallback(async () => {
    await Promise.all([mTrades(), mWithdrawals(), mAnalyses()]);
  }, [mTrades, mWithdrawals, mAnalyses]);
}

