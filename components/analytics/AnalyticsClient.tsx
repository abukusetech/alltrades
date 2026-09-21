"use client";

import * as React from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { breakdownBy, computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnalyticsStatsCards } from "./AnalyticsStatsCards";
import { EquityBars } from "./EquityBars";
import { BreakdownTable } from "./BreakdownTable";
import dynamic from "next/dynamic";

// Recharts is heavy — lazy load it. Donut renders after first paint.
const ResultsDonut = dynamic(
  () => import("./ResultsDonut").then((m) => m.ResultsDonut),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white text-2xs text-ink-500">
        Loading chart…
      </div>
    ),
  }
);

export function AnalyticsClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const byInstrument = React.useMemo(() => breakdownBy(trades, "instrument"), [trades]);
  const byStrategy = React.useMemo(() => breakdownBy(trades, "strategy"), [trades]);
  const bySession = React.useMemo(() => breakdownBy(trades, "session"), [trades]);
  const bySetup = React.useMemo(() => breakdownBy(trades, "setup_type"), [trades]);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Calculated from your manually recorded trading data." />

      {!currentAccount ? (
        <EmptyState title="No account selected" description="Create an account in Settings to view analytics." />
      ) : isLoading && trades.length === 0 ? (
        <BlockLoader label="Loading analytics" />
      ) : trades.length === 0 ? (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
          <EmptyState icon={<ChartNoAxesCombined className="h-4 w-4" />} title="No analytics data yet" description="Record trades in the Journal to build analytics." />
        </>
      ) : (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
          <AnalyticsStatsCards metrics={metrics} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EquityBars account={currentAccount} trades={trades} />
            </div>
            <div>
              <ResultsDonut metrics={metrics} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable title="By Instrument" rows={byInstrument} emptyLabel="No instrument data yet." />
            <BreakdownTable title="By Strategy" rows={byStrategy} emptyLabel="No strategy data yet." />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownTable title="By Session" rows={bySession} emptyLabel="No session data yet." />
            <BreakdownTable title="By Setup Type" rows={bySetup} emptyLabel="No setup data yet." />
          </div>
        </>
      )}
    </div>
  );
}
