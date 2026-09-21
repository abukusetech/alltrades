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

// One browser client for all hooks in this module.
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
 * Returns a callback that revalidates all account-scoped data.
 * Use after a mutation (create/edit/delete trade, withdrawal, analysis).
 */
export function useRevalidateAccount(accountId: string | null) {
  const { mutate: mTrades } = useSWR(swrKeys.trades(accountId));
  const { mutate: mWithdrawals } = useSWR(swrKeys.withdrawals(accountId));
  const { mutate: mAnalyses } = useSWR(swrKeys.analyses(accountId));

  return React.useCallback(async () => {
    await Promise.all([mTrades(), mWithdrawals(), mAnalyses()]);
  }, [mTrades, mWithdrawals, mAnalyses]);
}
