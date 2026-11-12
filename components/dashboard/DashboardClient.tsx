"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowUpRight,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import {
  useTradesForFilter,
  useWithdrawalsForFilter,
} from "@/lib/data/hooks";
import { computeAccountMetrics, computeDrawdownStatus } from "@/lib/calc";
import { getWeeklyLockStatus, type WeeklyLockStatus } from "@/lib/data/weekly-lock";
import { createClient } from "@/lib/supabase/client";
import { groupMetricsByType } from "@/lib/accounts/metrics";
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
import { WeeklyLockBanner } from "@/components/dashboard/WeeklyLockBanner";

const WorldClocks = dynamic(
  () => import("@/components/dashboard/WorldClocks").then((m) => m.WorldClocks),
  { ssr: false }
);
const SessionsPanel = dynamic(
  () => import("@/components/dashboard/SessionsPanel").then((m) => m.SessionsPanel),
  { ssr: false }
);

const workspaceLinks = [
  { href: "/daily-analysis", label: "Daily Analysis", detail: "Build the trading thesis" },
  { href: "/trade-check", label: "Trade Check", detail: "Validate execution conditions" },
  { href: "/market-intelligence", label: "Market Intelligence", detail: "Review market conditions" },
  { href: "/journal", label: "Journal", detail: "Review recorded executions" },
];

function SectionHeading({
  eyebrow,
  title,
  detail,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-ink-950">{title}</h2>
        {detail && <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-500">{detail}</p>}
      </div>
      {href && action && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-900">
          {action}<ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function DashboardClient() {
  const { currentAccount, filteredAccounts, filterMode } = useCurrentAccount();
  const { data: trades = [], isLoading: tradesLoading } = useTradesForFilter(filteredAccounts);
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawalsForFilter(filteredAccounts);
  const loading = tradesLoading || withdrawalsLoading;

  const supabase = React.useMemo(() => createClient(), []);
  const [weeklyStatus, setWeeklyStatus] = React.useState<WeeklyLockStatus | null>(null);

  React.useEffect(() => {
    let active = true;
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      try {
        const status = await getWeeklyLockStatus(supabase, user.id);
        if (active) setWeeklyStatus(status);
      } catch (e) {
        console.error(e);
      }
    }
    void loadStatus();
    return () => { active = false; };
  }, [supabase]);

  const primaryAccount = React.useMemo(() => {
    if (filterMode === "SINGLE") return currentAccount;
    if (filterMode === "MAVEN") return filteredAccounts.find((a) => a.account_type === "MAVEN") ?? null;
    if (filterMode === "PERSONAL") return filteredAccounts.find((a) => a.account_type === "PERSONAL") ?? null;
    return null;
  }, [filterMode, currentAccount, filteredAccounts]);

  const metrics = React.useMemo(
    () => computeAccountMetrics(primaryAccount ?? filteredAccounts[0] ?? null, trades, withdrawals),
    [primaryAccount, filteredAccounts, trades, withdrawals]
  );
  const drawdown = React.useMemo(
    () => computeDrawdownStatus(primaryAccount ?? filteredAccounts[0] ?? null, trades, withdrawals),
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
    <div className="space-y-7 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#233b57] bg-[#101d2e] px-5 py-6 text-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.7)] sm:px-7">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(66,122,169,0.28),transparent_48%),linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.025))]" />
        <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full border border-white/[0.07]" />
        <div className="pointer-events-none absolute -right-8 -top-16 -z-10 h-48 w-48 rounded-full border border-white/[0.07]" />
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.7)]" />
              AllTrades · Trading terminal
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Trading dashboard</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300">
              A unified view of account performance, market conditions and execution discipline.
            </p>
          </div>
          <Link href="/trade-check" className="shrink-0">
            <Button leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}>Open Trade Check</Button>
          </Link>
        </div>
        <div className="mt-6 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace status</p>
            <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-100"><LayoutDashboard className="h-3.5 w-3.5 text-sky-300" />Trading operations</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Risk framework</p>
            <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-100"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />Account rules monitored</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Market desk</p>
            <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-100"><Activity className="h-3.5 w-3.5 text-sky-300" />EURUSD · XAUUSD</p>
          </div>
        </div>
      </section>

      {filteredAccounts.length === 0 ? (
        <EmptyState
          title="No accounts in view"
          description="Change the account filter, or create a new account in Settings."
          action={<Link href="/settings"><Button>Open Settings</Button></Link>}
        />
      ) : loading ? (
        <BlockLoader label="Loading dashboard" />
      ) : (
        <>
          {primaryAccount && <AccountHeader account={primaryAccount} currentCapital={metrics.currentCapital} />}

          <section className="rounded-xl border border-border bg-white p-3 shadow-[0_5px_22px_-18px_rgba(15,23,42,0.35)] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">Operations</p>
                <h2 className="mt-0.5 text-sm font-semibold text-ink-900">Trading workspace</h2>
              </div>
              <span className="text-[10px] text-ink-400">Quick access</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {workspaceLinks.map((item) => (
                <Link key={item.href} href={item.href} className="group flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface-soft/70 px-3 py-3 transition hover:border-brand-300 hover:bg-brand-50/60">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-800 group-hover:text-brand-800">{item.label}</p>
                    <p className="mt-0.5 truncate text-[10px] text-ink-500">{item.detail}</p>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-white text-ink-400 transition group-hover:border-brand-200 group-hover:text-brand-700">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <WeeklyLockBanner />

          <section className="space-y-3">
            <SectionHeading
              eyebrow="01 · Account intelligence"
              title="Capital & performance"
              detail="Live account equity, realised performance, consistency and withdrawals."
            />
            <TypeAwareMetrics mode={filterMode} grouped={grouped} />
          </section>

          {!isAll && primaryAccount && (
            <section className="space-y-4">
              {isMaven && (
                <div className="space-y-3">
                  <SectionHeading eyebrow="02 · Risk controls" title="Daily target & risk" detail="Progress and remaining risk budget for the current trading day." />
                  <DailyTargetRiskCard todayPnL={drawdown.todayPnL} currentCapital={metrics.currentCapital} targetPercent={0.5} riskPercent={0.25} />
                </div>
              )}
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="space-y-4 xl:col-span-2">
                  {isMaven && <WithdrawalStatusCard metrics={metrics} />}
                  <RecentTradesCard trades={recentTrades} />
                </div>
                <div className="space-y-4">
                  <WeeklyDisciplineCard metrics={metrics} weeklyLossCount={weeklyStatus?.lossCount} isLocked={weeklyStatus?.isLocked} />
                  {isMaven && <ConsistencySummaryCard metrics={metrics} />}
                  {isPersonal && <PersonalRiskSummaryCard account={primaryAccount} />}
                </div>
              </div>
              {isMaven && (
                <div className="space-y-3">
                  <SectionHeading eyebrow="03 · Account protection" title="Drawdown & firm limits" detail="Monitor available loss capacity against the account's configured limits." />
                  <AccountRiskCard
                    drawdown={drawdown}
                    maxDailyPercent={Number(primaryAccount.max_daily_drawdown_percent) || 2}
                    maxTotalPercent={Number(primaryAccount.max_total_drawdown_percent) || 3}
                    currentEquity={metrics.currentCapital}
                    consistencyScore={metrics.consistency?.score ?? null}
                    mostProfitableDay={metrics.biggestWinningDay}
                    totalProfits={metrics.totalPnL}
                    accountId={primaryAccount.id}
                  />
                </div>
              )}
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-brand-600" />
              <div>
                <h2 className="text-base font-semibold tracking-tight text-ink-950">Live sessions & ICT kill zones</h2>
                <p className="mt-1 text-xs text-ink-500">Session status in East Africa Time, with ICT kill-zone timing referenced to New York.</p>
              </div>
            </div>
            <SessionsPanel />
          </section>

          <section className="space-y-3">
            <SectionHeading
              eyebrow="05 · Global time"
              title="World clocks"
              detail="Live local time across the four trading centres. Clock calculations remain timezone-aware."
            />
            <WorldClocks />
          </section>

          {isAll && (
            <section className="space-y-3">
              <SectionHeading eyebrow="06 · Execution history" title="Recent trades" href="/journal" action="Open journal" />
              <RecentTradesCard trades={recentTrades} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
