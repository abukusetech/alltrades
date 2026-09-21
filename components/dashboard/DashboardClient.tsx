"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics, computeDrawdownStatus } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { MetricCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { WithdrawalStatusCard } from "./WithdrawalStatusCard";
import { WeeklyDisciplineCard } from "./WeeklyDisciplineCard";
import { ConsistencySummaryCard } from "./ConsistencySummaryCard";
import { RecentTradesCard } from "./RecentTradesCard";
import { AccountRiskCard } from "./AccountRiskCard";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function DashboardClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading: tradesLoading } =
    useTrades(currentAccountId);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } =
    useWithdrawals(currentAccountId);

  const loading = tradesLoading || withdrawalsLoading;

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );
  const drawdown = React.useMemo(
    () => computeDrawdownStatus(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );
  const recentTrades = React.useMemo(() => trades.slice(0, 8), [trades]);

  const totalPnLClass =
    metrics.totalPnL > 0
      ? "text-profit-text"
      : metrics.totalPnL < 0
        ? "text-loss-text"
        : "text-ink-900";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Funded account performance, discipline and withdrawal status."
        actions={
          <Link href="/journal">
            <Button leftIcon={<Plus className="h-3.5 w-3.5" />}>
              New Trade
            </Button>
          </Link>
        }
      />

      {!currentAccount ? (
        <EmptyState
          title="No account selected"
          description="Create your first trading account in Settings to start recording trades."
          action={
            <Link href="/settings">
              <Button>Open Settings</Button>
            </Link>
          }
        />
      ) : (
        <>
          <AccountHeader
            account={currentAccount}
            currentCapital={metrics.currentCapital}
          />

          {loading ? (
            <BlockLoader label="Loading dashboard" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Current Capital"
                  value={formatCurrency(metrics.currentCapital)}
                  hint={`Starting ${formatCurrency(metrics.startingCapital)}`}
                />
                <MetricCard
                  label="Total P/L"
                  value={formatCurrency(metrics.totalPnL, { showSign: true })}
                  valueClassName={totalPnLClass}
                  hint={`${metrics.totalTrades} ${metrics.totalTrades === 1 ? "trade" : "trades"}`}
                />
                <MetricCard
                  label="Consistency Score"
                  value={formatPercent(metrics.consistencyScore, 1)}
                  valueClassName={
                    metrics.consistencyStatus === "over"
                      ? "text-loss-text"
                      : metrics.consistencyStatus === "approaching"
                        ? "text-warn-text"
                        : undefined
                  }
                  hint={`Limit ${formatPercent(metrics.maxConsistencyPercent, 0)}`}
                />
                <MetricCard
                  label="Weekly Trades"
                  value={`${metrics.weeklyTradeCount} / ${metrics.maxWeeklyTrades}`}
                  hint={
                    metrics.weeklyLimitReached
                      ? "Limit reached"
                      : `${metrics.weeklyRemaining} remaining this week`
                  }
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  <WithdrawalStatusCard metrics={metrics} />
                  <RecentTradesCard trades={recentTrades} />
                </div>
                <div className="space-y-4">
                  <WeeklyDisciplineCard metrics={metrics} />
                  <ConsistencySummaryCard metrics={metrics} />
                </div>
              </div>

              <AccountRiskCard
                drawdown={drawdown}
                maxDailyPercent={Number(currentAccount.max_daily_drawdown_percent) || 2}
                maxTotalPercent={Number(currentAccount.max_total_drawdown_percent) || 3}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
