"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import {
  useTradesForFilter,
  useWithdrawalsForFilter,
} from "@/lib/data/hooks";
import { computeAccountMetrics, computeDrawdownStatus } from "@/lib/calc";
import { getWeeklyLockStatus, type WeeklyLockStatus } from "@/lib/data/weekly-lock";
import { createClient } from "@/lib/supabase/client";
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
import dynamic from "next/dynamic";
const WorldClocks = dynamic(() => import("@/components/dashboard/WorldClocks").then(m => m.WorldClocks), { ssr: false });
import { AccountRiskCard } from "@/components/dashboard/AccountRiskCard";
import { DailyTargetRiskCard } from "@/components/dashboard/DailyTargetRiskCard";
import { TypeAwareMetrics } from "@/components/dashboard/TypeAwareMetrics";
import { WeeklyLockBanner } from "@/components/dashboard/WeeklyLockBanner";

export function DashboardClient() {
  const { currentAccount, filteredAccounts, filterMode } = useCurrentAccount();

  const { data: trades = [], isLoading: tradesLoading } =
    useTradesForFilter(filteredAccounts);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } =
    useWithdrawalsForFilter(filteredAccounts);

  const loading = tradesLoading || withdrawalsLoading;

  const supabase = React.useMemo(() => createClient(), []);
  const [weeklyStatus, setWeeklyStatus] = React.useState<WeeklyLockStatus | null>(null);

  React.useEffect(() => {
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        setWeeklyStatus(await getWeeklyLockStatus(supabase, user.id));
      } catch (e) {
        console.error(e);
      }
    }
    void loadStatus();
  }, [supabase]);

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
    <div className="space-y-6 pb-4">
      <div className="relative overflow-hidden rounded-2xl border border-ink-800/10 bg-gradient-to-br from-[#101b31] via-[#172943] to-[#203d5b] px-5 py-5 text-white shadow-[0_14px_38px_-24px_rgba(15,23,42,0.65)] sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              Trading overview
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Dashboard</h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-300">
              {isAll
                ? "A consolidated view of your trading accounts, with each account type kept separate."
                : isMaven
                  ? `${primaryAccount?.broker || primaryAccount?.maven_rules?.program_label || "Funded account"} performance, discipline and payout status.`
                  : isPersonal
                    ? "Personal Capital account performance and risk plan."
                    : "Funded account performance, discipline and withdrawal status."}
            </p>
          </div>
          <Link href="/trade-check" className="relative shrink-0">
            <Button leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}>Trade Check</Button>
          </Link>
        </div>
      </div>

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

          <nav aria-label="Trading workspace" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white/90 p-3 shadow-[0_4px_18px_-14px_rgba(15,23,42,0.35)]">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Workspace</span>
            <Link href="/daily-analysis" className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">Daily Analysis</Link>
            <Link href="/trade-check" className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">Trade Check</Link>
            <Link href="/market-intelligence" className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">Market Intelligence</Link>
            <Link href="/journal" className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-xs font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">Journal</Link>
          </nav>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">Performance</p>
                <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-ink-900">Account overview</h2>
              </div>
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-medium text-ink-500 shadow-sm">Live account data</span>
            </div>
            <TypeAwareMetrics mode={filterMode} grouped={grouped} />
          </section>
          <WeeklyLockBanner />

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

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="space-y-4 xl:col-span-2">
                  {/* Withdrawal Status — MAVEN ONLY */}
                  {isMaven && <WithdrawalStatusCard metrics={metrics} />}
                  <RecentTradesCard trades={recentTrades} />
                </div>

                <div className="space-y-4">
                  <WeeklyDisciplineCard metrics={metrics} weeklyLossCount={weeklyStatus?.lossCount} isLocked={weeklyStatus?.isLocked} />

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
                  currentEquity={metrics.currentCapital}
                  consistencyScore={metrics.consistency?.score ?? null}
                  mostProfitableDay={metrics.biggestWinningDay}
                  totalProfits={metrics.totalPnL}
                  accountId={primaryAccount.id}
                />
              )}
            </>
          )}


          {/* World Clocks — Wave 1 */}
          <WorldClocks />

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











