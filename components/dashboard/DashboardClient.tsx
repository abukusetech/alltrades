"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import {
  useTradesForFilter,
  useWithdrawalsForFilter,
} from "@/lib/data/hooks";
import { computeAccountMetrics, computeDrawdownStatus } from "@/lib/calc";
import { groupMetricsByType } from "@/lib/accounts/metrics";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Button } from "@/components/ui/Button";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { WithdrawalStatusCard } from "@/components/dashboard/WithdrawalStatusCard";
import { WeeklyDisciplineCard } from "@/components/dashboard/WeeklyDisciplineCard";
import { ConsistencySummaryCard } from "@/components/dashboard/ConsistencySummaryCard";
import { PersonalRiskSummaryCard } from "@/components/dashboard/PersonalRiskSummaryCard";
import { RecentTradesCard } from "@/components/dashboard/RecentTradesCard";
import { AccountRiskCard } from "@/components/dashboard/AccountRiskCard";
import { DailyTargetRiskCard } from "@/components/dashboard/DailyTargetRiskCard";
import { TypeAwareMetrics } from "@/components/dashboard/TypeAwareMetrics";

export function DashboardClient() {
  const { currentAccount, filteredAccounts, filterMode } = useCurrentAccount();

  const { data: trades = [], isLoading: tradesLoading } =
    useTradesForFilter(filteredAccounts);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } =
    useWithdrawalsForFilter(filteredAccounts);

  const loading = tradesLoading || withdrawalsLoading;

  // Pick the primary account for the rich cards.
  const primaryAccount = React.useMemo(() => {
    if (filterMode === "SINGLE") return currentAccount;
    if (filterMode === "MAVEN") {
      return filteredAccounts.find((a) => a.account_type === "MAVEN") ?? null;
    }
    if (filterMode === "PERSONAL") {
      return filteredAccounts.find((a) => a.account_type === "PERSONAL") ?? null;
    }
    return null;
  }, [filterMode, currentAccount, filteredAccounts]);

  const metrics = React.useMemo(
    () =>
      computeAccountMetrics(
        primaryAccount ?? filteredAccounts[0] ?? null,
        trades,
        withdrawals
      ),
    [primaryAccount, filteredAccounts, trades, withdrawals]
  );

  const drawdown = React.useMemo(
    () =>
      computeDrawdownStatus(
        primaryAccount ?? filteredAccounts[0] ?? null,
        trades,
        withdrawals
      ),
    [primaryAccount, filteredAccounts, trades, withdrawals]
  );

  const grouped = React.useMemo(
    () => groupMetricsByType(filteredAccounts, trades, withdrawals),
    [filteredAccounts, trades, withdrawals]
  );

  const recentTrades = React.useMemo(() => trades.slice(0, 8), [trades]);

  const isAll = filterMode === "ALL";
  const isMaven = primaryAccount?.account_type === "MAVEN";
  const isPersonal = primaryAccount?.account_type === "PERSONAL";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          isAll
            ? "Combined view of Maven and Personal accounts — kept separate below."
            : isMaven
              ? "Maven Prop Firm account performance, discipline and withdrawal status."
              : isPersonal
                ? "Personal Capital account performance and risk plan."
                : "Funded account performance, discipline and withdrawal status."
        }
        actions={
          <Link href="/journal">
            <Button leftIcon={<Plus className="h-3.5 w-3.5" />}>
              New Trade
            </Button>
          </Link>
        }
      />

      {filteredAccounts.length === 0 ? (
        <EmptyState
          title="No accounts in view"
          description="Change the account filter, or create a new account in Settings."
          action={
            <Link href="/settings">
              <Button>Open Settings</Button>
            </Link>
          }
        />
      ) : loading ? (
        <BlockLoader label="Loading dashboard" />
      ) : (
        <>
          {primaryAccount && (
            <AccountHeader
              account={primaryAccount}
              currentCapital={metrics.currentCapital}
            />
          )}

          <TypeAwareMetrics mode={filterMode} grouped={grouped} />

          {!isAll && primaryAccount && (
            <>
              {/* Daily Target & Risk — use Maven defaults only for Maven accounts.
                  Personal accounts use their own plan limits. */}
              {isMaven && (
                <DailyTargetRiskCard
                  todayPnL={drawdown.todayPnL}
                  currentCapital={metrics.currentCapital}
                  targetPercent={0.5}
                  riskPercent={0.25}
                />
              )}

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  {/* Withdrawal Status — MAVEN ONLY */}
                  {isMaven && <WithdrawalStatusCard metrics={metrics} />}
                  <RecentTradesCard trades={recentTrades} />
                </div>

                <div className="space-y-4">
                  <WeeklyDisciplineCard metrics={metrics} />

                  {/* Right-column card — swap by type */}
                  {isMaven && <ConsistencySummaryCard metrics={metrics} />}
                  {isPersonal && (
                    <PersonalRiskSummaryCard account={primaryAccount} />
                  )}
                </div>
              </div>

              {/* Risk & Drawdown — MAVEN ONLY (uses firm drawdown rules) */}
              {isMaven && (
                <AccountRiskCard
                  drawdown={drawdown}
                  maxDailyPercent={
                    Number(primaryAccount.max_daily_drawdown_percent) || 2
                  }
                  maxTotalPercent={
                    Number(primaryAccount.max_total_drawdown_percent) || 3
                  }
                />
              )}
            </>
          )}

          {isAll && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentTradesCard trades={recentTrades} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

