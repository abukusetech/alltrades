"use client";

import * as React from "react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConsistencyScoreCard } from "./ConsistencyScoreCard";
import { ConsistencyStats } from "./ConsistencyStats";
import { RuleExplainer } from "./RuleExplainer";

export function ConsistencyClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const averageTradesPerWeek = React.useMemo(() => {
    if (!currentAccount || trades.length === 0) return 0;
    const weeks = new Set<string>();
    for (const t of trades) {
      const d = new Date(t.trade_date + "T00:00:00");
      const day = d.getDay();
      const diff = (day + 6) % 7;
      d.setDate(d.getDate() - diff);
      weeks.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return weeks.size > 0 ? trades.length / weeks.size : 0;
  }, [trades, currentAccount]);

  return (
    <div className="space-y-6">
      <PageHeader title="Consistency" subtitle="Your score controls withdrawal eligibility." />

      {!currentAccount ? (
        <EmptyState title="No account selected" description="Create an account in Settings to view consistency." />
      ) : isLoading && trades.length === 0 ? (
        <BlockLoader label="Loading consistency" />
      ) : (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
          <ConsistencyStats metrics={metrics} averageTradesPerWeek={averageTradesPerWeek} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <ConsistencyScoreCard metrics={metrics} />
              <RuleExplainer />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Withdrawal gate</CardTitle></CardHeader>
                <CardBody className="space-y-3">
                  <GateRow ok={metrics.consistencyScore <= metrics.maxConsistencyPercent} label="Consistency ≤ 20%" value={`${metrics.consistencyScore.toFixed(1)}%`} />
                  <GateRow ok={metrics.targetReached} label="Profit target reached" value={metrics.targetReached ? "Yes" : `$${metrics.amountRemaining.toFixed(2)} to go`} />
                  <div className={
                    metrics.withdrawalEligible
                      ? "rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs font-medium text-profit-text"
                      : "rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs font-medium text-warn-text"
                  }>
                    {metrics.withdrawalEligible
                      ? "Withdrawal eligible."
                      : metrics.withdrawalBlockReason === "TARGET_NOT_REACHED"
                        ? "Withdrawal blocked — profit target not yet reached."
                        : metrics.withdrawalBlockReason === "CONSISTENCY_ABOVE_LIMIT"
                          ? "Withdrawal blocked — consistency above limit."
                          : "Withdrawal blocked."}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GateRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border bg-surface-soft px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={
          ok ? "flex h-4 w-4 items-center justify-center rounded-full bg-profit text-white text-3xs"
             : "flex h-4 w-4 items-center justify-center rounded-full bg-warn text-white text-3xs"
        } aria-hidden="true">
          {ok ? "✓" : "!"}
        </span>
        <span className="text-2xs text-ink-700">{label}</span>
      </div>
      <span className="tabular text-2xs font-medium text-ink-900">{value}</span>
    </div>
  );
}
