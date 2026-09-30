"use client";

import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { aggregateWeek, computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { WeekNav } from "./WeekNav";
import { WeekStats } from "./WeekStats";
import { WeekSummaryLists } from "./WeekSummaryLists";
import { WeekReviewForm } from "./WeekReviewForm";
import { DailyAnalysisSummary } from "./DailyAnalysisSummary";
import { endOfWeek, startOfWeek, toDateKey } from "@/lib/utils";

export function WeeklyReviewClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date()));

  const weekEnd = React.useMemo(() => endOfWeek(weekStart), [weekStart]);
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfWeek(new Date()));

  const week = React.useMemo(() => aggregateWeek(trades, weekStart), [trades, weekStart]);
  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  function prevWeek() { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); }
  function nextWeek() { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); }
  function goThisWeek() { setWeekStart(startOfWeek(new Date())); }

  return (
    <div className="space-y-6">
      <PageHeader title="Weekly Review" subtitle="A summary of your actual trading week and what to improve." />

      {!currentAccount ? (
        <EmptyState title="No account selected" description="Create an account in Settings to review a trading week." />
      ) : isLoading && trades.length === 0 ? (
        <BlockLoader label="Loading weekly review" />
      ) : (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
          <WeekNav weekStart={weekStart} weekEnd={weekEnd} isCurrent={isCurrentWeek} onPrev={prevWeek} onNext={nextWeek} onToday={goThisWeek} />

          {week.totalTrades === 0 ? (
            <EmptyState icon={<ClipboardCheck className="h-4 w-4" />} title="No trades this week" description="Record trades in the Journal to review your week." />
          ) : (
            <>
              <WeekStats week={week} />
              <WeekSummaryLists week={week} />
            </>
          )}

          <WeekReviewForm accountId={currentAccount.id} weekStart={toDateKey(weekStart)} weekEnd={toDateKey(weekEnd)} />
        </>
      )}
    </div>
  );
}

