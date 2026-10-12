"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sunrise,
  Info,
  Building2,
  User,
} from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import {
  useTrades,
  useWithdrawals,
  useAnalyses,
} from "@/lib/data/hooks";
import { useDailyAnalysis, useDailyAnalysesHistory } from "@/lib/data/daily-analysis-hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { computeTradeCheck } from "@/lib/accounts/trade-check";
import { getActiveMavenRuleVersion } from "@/lib/data/maven-rules";
import { getActivePersonalPlan } from "@/lib/data/personal-plans";
import { getActiveMavenRuleVersion as _m } from "@/lib/data/maven-rules";
import {
  accountTypeLabel,
  accountTypeTone,
} from "@/lib/accounts/rules";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  cn,
  formatCurrency,
  formatDateMedium,
  toDateKey,
} from "@/lib/utils";
import type {
  MavenRuleVersion,
  PersonalTradingPlan,
} from "@/lib/types";

export function TradeCheckClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get("analysis");

  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const [mavenRule, setMavenRule] = React.useState<MavenRuleVersion | null>(null);
  const [personalPlan, setPersonalPlan] = React.useState<PersonalTradingPlan | null>(null);
  const [loadingRule, setLoadingRule] = React.useState(false);

  // Load the rule set matching the current account type
  React.useEffect(() => {
    if (!currentAccount) return;
    let cancelled = false;
    setLoadingRule(true);
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        if (currentAccount.account_type === "MAVEN") {
          const r = await getActiveMavenRuleVersion(supabase, user.id);
          if (!cancelled) setMavenRule(r);
        } else if (currentAccount.account_type === "PERSONAL") {
          const p = await getActivePersonalPlan(supabase, currentAccount.id);
          if (!cancelled) setPersonalPlan(p);
        }
      } finally {
        if (!cancelled) setLoadingRule(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentAccount, supabase]);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  // For the daily context, use the latest Daily Analysis if linked
  const today = toDateKey(new Date());
  const { data: todayAnalysis } = useDailyAnalysis(currentAccountId, today);
  const { data: history = [] } = useDailyAnalysesHistory(currentAccountId, 30);

  const analysis = React.useMemo(() => {
    if (analysisIdParam) {
      const found = history.find((a) => a.id === analysisIdParam);
      if (found) return found;
    }
    return todayAnalysis ?? null;
  }, [analysisIdParam, history, todayAnalysis]);

  const todayTrades = React.useMemo(
    () => trades.filter((t) => t.trade_date === today),
    [trades, today]
  );

  const todayPnL = React.useMemo(
    () => todayTrades.reduce((s, t) => s + Number(t.profit_loss || 0), 0),
    [todayTrades]
  );

  const weekTrades = React.useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    const start = d.toISOString().slice(0, 10);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const endKey = end.toISOString().slice(0, 10);
    return trades.filter(
      (t) => t.trade_date >= start && t.trade_date <= endKey
    );
  }, [trades]);

  const monthTrades = React.useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return trades.filter((t) => t.trade_date.startsWith(prefix));
  }, [trades]);

  const check = React.useMemo(() => {
    if (!currentAccount) return null;
    return computeTradeCheck({
      account: currentAccount,
      mavenRule,
      personalPlan,
      plannedRiskAmount:
        analysis?.planned_risk_amount != null
          ? Number(analysis.planned_risk_amount)
          : null,
      plannedRiskPercent:
        analysis?.planned_risk_percent != null
          ? Number(analysis.planned_risk_percent)
          : null,
      plannedRR:
        analysis?.planned_rr != null ? Number(analysis.planned_rr) : null,
      instrument: analysis?.instrument ?? currentAccount.allowed_instrument ?? "EURUSD",
      session:
        analysis?.session_tags && analysis.session_tags.length > 0
          ? analysis.session_tags[0]
          : null,
      newsHighImpact: analysis?.news_major ?? false,
      tradesToday: todayTrades.length,
      tradesThisWeek: weekTrades.length,
      tradesThisMonth: monthTrades.length,
      todayPnL,
      currentCapital: metrics.currentCapital,
    });
  }, [
    currentAccount,
    mavenRule,
    personalPlan,
    analysis,
    todayTrades.length,
    weekTrades.length,
    monthTrades.length,
    todayPnL,
    metrics.currentCapital,
  ]);

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Trade Check"
          subtitle="Validates your plan against the applicable rules."
        />
        <EmptyState
          title="No account selected"
          description="Create an account first in Settings."
        />
      </div>
    );
  }

  if (isLoading || loadingRule) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Trade Check"
          subtitle="Validates your plan against the applicable rules."
        />
        <BlockLoader label="Loading Trade Check" />
      </div>
    );
  }

  const isMaven = currentAccount.account_type === "MAVEN";
  const isPersonal = currentAccount.account_type === "PERSONAL";
  const isUnclassified = currentAccount.account_type === "UNCLASSIFIED";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Check"
        subtitle={
          isMaven
            ? "Validates your plan against Maven Instant Funding rules."
            : isPersonal
              ? "Validates your plan against your Personal Trading Plan."
              : "Set the account type in Settings to enable validation."
        }
        actions={
          <Badge tone={accountTypeTone(currentAccount.account_type)}>
            {accountTypeLabel(currentAccount.account_type)}
          </Badge>
        }
      />

      <AccountHeader
        account={currentAccount}
        currentCapital={metrics.currentCapital}
      />

      {!analysis ? (
        <EmptyState
          icon={<Sunrise className="h-4 w-4" />}
          title="No Daily Analysis for today"
          description="Create one to have Trade Check read your plan automatically."
          action={
            <Link href="/daily-analysis">
              <Button>Open Daily Analysis</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Linked Analysis */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-brand-700" />
              <div>
                <div className="text-2xs font-semibold text-brand-800">
                  Linked Analysis · {analysis.instrument}
                </div>
                <div className="text-3xs text-brand-700">
                  {formatDateMedium(new Date(analysis.analysis_date + "T00:00:00"))}
                  {" · "}
                  {analysis.planned_direction ?? "—"}
                  {analysis.planned_rr != null
                    ? ` · 1:${Number(analysis.planned_rr).toFixed(2)}`
                    : ""}
                </div>
              </div>
            </div>
            <Link href={`/daily-analysis?date=${analysis.analysis_date}`}>
              <Button variant="outline" size="sm">
                Open Daily Analysis
              </Button>
            </Link>
          </div>

          {/* Rule source banner */}
          {isMaven && mavenRule && (
            <div className="flex items-start gap-2 rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-800">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium">Validated against Maven Instant Funding rules</div>
                <div className="mt-0.5 text-3xs opacity-90">
                  Version {mavenRule.version_label} · Effective from{" "}
                  {mavenRule.effective_from}
                </div>
              </div>
            </div>
          )}

          {isPersonal && personalPlan && (
            <div className="flex items-start gap-2 rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
              <User className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium">Validated against your Personal Trading Plan</div>
                <div className="mt-0.5 text-3xs opacity-90">
                  Version {personalPlan.version_label} · Effective from{" "}
                  {personalPlan.effective_from}
                </div>
              </div>
            </div>
          )}

          {isUnclassified && (
            <div className="flex items-start gap-2 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium">Account not classified</div>
                <div className="mt-0.5 opacity-90">
                  Set the account type in Settings to enable validation.
                </div>
              </div>
            </div>
          )}

          {/* Checklist */}
          {check && check.checks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-brand-600" />
                  <CardTitle>
                    {isMaven ? "Maven Rules" : "Your Plan"}
                  </CardTitle>
                </div>
                <Badge
                  tone={
                    check.blocked
                      ? "loss"
                      : check.passed === check.total
                        ? "profit"
                        : "warn"
                  }
                >
                  {check.passed} / {check.total}
                </Badge>
              </CardHeader>
              <CardBody className="space-y-2">
                {check.checks.map((c) => (
                  <CheckRow key={c.key} item={c} />
                ))}
              </CardBody>
            </Card>
          )}

          {/* Summary + Take Trade */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Gate</CardTitle>
              <Badge
                tone={
                  check?.blocked
                    ? "loss"
                    : check && check.passed === check.total
                      ? "profit"
                      : "warn"
                }
              >
                {check?.blocked
                  ? "BLOCKED"
                  : check && check.passed === check.total
                    ? "READY"
                    : "REVIEW"}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              <div
                className={cn(
                  "rounded border px-3 py-2 text-2xs",
                  check?.blocked
                    ? "border-loss-border bg-loss-bg text-loss-text"
                    : check && check.passed === check.total
                      ? "border-profit-border bg-profit-bg text-profit-text"
                      : "border-warn-border bg-warn-bg text-warn-text"
                )}
              >
                {check?.summary}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/journal?new=1&analysis=${analysis.id}`}>
                  <Button
                    disabled={!!check?.blocked}
                    title={
                      check?.blocked
                        ? "Fix rule violations before recording a trade."
                        : undefined
                    }
                  >
                    Take Trade
                  </Button>
                </Link>
                {todayTrades.length > 0 && (
                  <Badge tone="brand">
                    SESSION COMPLETE — {todayTrades.length} trade
                    {todayTrades.length === 1 ? "" : "s"} today
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function CheckRow({ item }: { item: import("@/lib/accounts/trade-check").TradeCheckItem }) {
  const Icon =
    item.passed
      ? CheckCircle2
      : item.severity === "violation"
        ? XCircle
        : AlertTriangle;

  const containerClass = item.passed
    ? "border-profit-border bg-profit-bg text-profit-text"
    : item.severity === "violation"
      ? "border-loss-border bg-loss-bg text-loss-text"
      : "border-warn-border bg-warn-bg text-warn-text";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded border px-3 py-2 text-2xs",
        containerClass
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{item.label}</div>
        {item.detail && (
          <div className="mt-0.5 text-3xs opacity-90">{item.detail}</div>
        )}
      </div>
      <span className="shrink-0 text-3xs uppercase tracking-wide opacity-70">
        {item.source}
      </span>
    </div>
  );
}
