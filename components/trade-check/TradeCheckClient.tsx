"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Target,
  TrendingUp,
  Award,
  Sunrise,
  AlertTriangle,
} from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals, useAnalyses } from "@/lib/data/hooks";
import { useDailyAnalysis, useDailyAnalysesHistory } from "@/lib/data/daily-analysis-hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { computeReadiness } from "@/lib/readiness";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { computeDisciplineScore } from "@/lib/data/discipline";
import { cn, formatCurrency, formatDateMedium, formatPercent, toDateKey } from "@/lib/utils";

export function TradeCheckClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get("analysis");

  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const { data: analyses = [] } = useAnalyses(currentAccountId);

  const todayKey = toDateKey(new Date());
  const { data: todayAnalysis } = useDailyAnalysis(currentAccountId, todayKey);
  const { data: history = [] } = useDailyAnalysesHistory(currentAccountId, 30);

  // Pick the analysis to display — the linked one, else today's
  const analysis = React.useMemo(() => {
    if (analysisIdParam) {
      const found = history.find((a) => a.id === analysisIdParam);
      if (found) return found;
    }
    return todayAnalysis ?? null;
  }, [analysisIdParam, history, todayAnalysis]);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const todayTrades = React.useMemo(
    () => trades.filter((t) => t.trade_date === todayKey),
    [trades, todayKey]
  );

  const analysisRuleChecks = React.useMemo(() => {
    if (!analysis || !currentAccount) return [];

    // Derived values — computed fresh so the rule engine always sees
    // what Daily Analysis is currently showing, even if DB is stale.
    const derivedSlPips = (() => {
      if (analysis.planned_sl_pips !== null) return analysis.planned_sl_pips;
      if (analysis.planned_entry === null || analysis.planned_stop_loss === null) return null;
      const diff = Math.abs(analysis.planned_entry - analysis.planned_stop_loss);
      const pipSize =
        analysis.instrument === "USDJPY" || analysis.instrument === "GBPJPY"
          ? 0.01
          : analysis.instrument === "XAUUSD / Gold"
            ? 0.1
            : analysis.instrument === "NAS100" || analysis.instrument === "US30" || analysis.instrument === "SPX500"
              ? 1
              : 0.0001;
      const raw = diff / pipSize;
      return Number.isFinite(raw) ? Number(raw.toFixed(1)) : null;
    })();

    const derivedRr = (() => {
      // Always prefer the stored value, then fall back to live computation
      if (analysis.planned_rr !== null) {
        return Number(analysis.planned_rr.toFixed(2));
      }
      if (
        analysis.planned_entry === null ||
        analysis.planned_stop_loss === null ||
        analysis.planned_take_profit === null
      ) {
        return null;
      }
      const risk = Math.abs(analysis.planned_entry - analysis.planned_stop_loss);
      const reward = Math.abs(analysis.planned_take_profit - analysis.planned_entry);
      if (risk <= 0) return null;
      const value = reward / risk;
      if (!Number.isFinite(value)) return null;
      return Number(value.toFixed(2));
    })();

    const riskPct = analysis.planned_risk_percent ?? 0;
    const sl = derivedSlPips;
    const rr = derivedRr;
    return [
      {
        key: "instrument",
        label: `Instrument ${currentAccount.allowed_instrument ?? "EURUSD"}`,
        passed: analysis.instrument === (currentAccount.allowed_instrument ?? "EURUSD"),
      },
      {
        key: "news",
        label: "No high-impact news",
        passed: !analysis.news_major,
      },
      {
        key: "risk",
        label: "Risk ≤ 0.25%",
        passed: riskPct !== null && riskPct <= 0.25,
      },
      {
        key: "sl",
        label:
          sl !== null
            ? `SL ${sl.toFixed(1)} pips (need 10–15)`
            : "SL 10–15 pips",
        passed: sl !== null && sl >= 10 && sl <= 15,
      },
      {
        key: "rr",
        label:
          rr !== null
            ? `RR 1:${rr.toFixed(2)} (need ≥ 1:2)`
            : "RR ≥ 1:2",
        passed: rr !== null && rr >= 1.995,
      },
      {
        key: "daily_limit",
        label: "Daily trade available",
        passed: todayTrades.length < (currentAccount.max_daily_trades ?? 1),
        detail:
          todayTrades.length >= (currentAccount.max_daily_trades ?? 1)
            ? `${todayTrades.length} trade${todayTrades.length > 1 ? "s" : ""} already recorded today`
            : "No trade recorded today",
      },
      {
        key: "monthly_limit",
        label: "12 trades/month limit",
        passed: metrics.totalTrades < (currentAccount.max_monthly_trades ?? 12),
      },
    ];
  }, [analysis, currentAccount, todayTrades, metrics]);

  const rulePass = analysisRuleChecks.filter((r) => r.passed).length;
  const ruleTotal = analysisRuleChecks.length;

  const readiness = analysis ? computeReadiness(analysis) : null;

  // Discipline (reused from before)
  const discipline = React.useMemo(() => {
    if (!currentAccount) return { percent: 0, passed: 0, total: 0, rules: [] };
    return computeDisciplineScore({
      trades,
      account: currentAccount,
      currentCapital: metrics.currentCapital,
      rules: {
        maxTradesPerDay: currentAccount.max_daily_trades ?? 1,
        allowedInstrument: currentAccount.allowed_instrument ?? "EURUSD",
        maxRiskPercentPerTrade: 0.25,
        forbiddenOnNews: true,
        minRR: currentAccount.min_rr ?? 2,
        maxTradesPerMonth: currentAccount.max_monthly_trades ?? 12,
      },
    });
  }, [trades, currentAccount, metrics.currentCapital]);

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Trade Check"
          subtitle="Validates your Daily Analysis before execution."
        />
        <EmptyState
          title="No account selected"
          description="Create an account in Settings first."
        />
      </div>
    );
  }

  if (isLoading && trades.length === 0 && !analysis) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Trade Check"
          subtitle="Validates your Daily Analysis before execution."
        />
        <BlockLoader label="Loading Trade Check" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Check"
        subtitle="Validates your Daily Analysis against your rules before execution."
      />

      <AccountHeader
        account={currentAccount}
        currentCapital={metrics.currentCapital}
      />

      {!analysis ? (
        <EmptyState
          icon={<Sunrise className="h-4 w-4" />}
          title="No Daily Analysis found"
          description="Create today's analysis first. Trade Check will read your plan automatically."
          action={
            <Link href="/daily-analysis">
              <Button>Open Daily Analysis</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* LINKED ANALYSIS BANNER */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-brand-700" />
              <div>
                <div className="text-2xs font-semibold text-brand-800">
                  Linked Analysis:{" "}
                  {analysisIdParam
                    ? `PLAN #${analysis.analysis_date.replace(/-/g, "")}-01`
                    : "Today"}
                </div>
                <div className="text-3xs text-brand-700">
                  {formatDateMedium(new Date(analysis.analysis_date + "T00:00:00"))} ·{" "}
                  {analysis.instrument}
                </div>
              </div>
            </div>
            <Link href={`/daily-analysis?date=${analysis.analysis_date}`}>
              <Button variant="outline" size="sm">
                Open Daily Analysis
              </Button>
            </Link>
          </div>

          {/* PLAN SUMMARY */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Summary</CardTitle>
              {readiness && (
                <Badge tone={readiness.status === "TRADE_READY" ? "profit" : "warn"}>
                  {readiness.percent}% ready
                </Badge>
              )}
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Instrument" value={analysis.instrument} />
              <Stat
                label="Direction"
                value={analysis.planned_direction ?? "—"}
              />
              <Stat
                label="Entry"
                value={analysis.planned_entry !== null ? String(analysis.planned_entry) : "—"}
              />
              <Stat
                label="Stop Loss"
                value={analysis.planned_stop_loss !== null ? String(analysis.planned_stop_loss) : "—"}
              />
              <Stat
                label="Take Profit"
                value={analysis.planned_take_profit !== null ? String(analysis.planned_take_profit) : "—"}
              />
              <Stat
                label="SL Pips"
                value={analysis.planned_sl_pips !== null ? `${analysis.planned_sl_pips} pips` : "—"}
              />
              <Stat
                label="Risk %"
                value={
                  analysis.planned_risk_percent !== null
                    ? `${analysis.planned_risk_percent}%`
                    : "—"
                }
              />
              <Stat
                label="RR"
                value={analysis.planned_rr !== null ? `1:${analysis.planned_rr.toFixed(2)}` : "—"}
              />
            </CardBody>
          </Card>

          {/* RULE CHECKS */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-brand-600" />
                <CardTitle>Rule Checks</CardTitle>
              </div>
              <Badge tone={rulePass === ruleTotal ? "profit" : "warn"}>
                {rulePass} / {ruleTotal}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-2">
              {analysisRuleChecks.map((r) => (
                <div
                  key={r.key}
                  className={cn(
                    "flex items-center gap-2 rounded border px-3 py-2 text-2xs",
                    r.passed
                      ? "border-profit-border bg-profit-bg text-profit-text"
                      : "border-loss-border bg-loss-bg text-loss-text"
                  )}
                >
                  {r.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {r.label}
                </div>
              ))}
            </CardBody>
          </Card>

          {/* READINESS GATE */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Gate</CardTitle>
              <Badge
                tone={
                  readiness?.status === "TRADE_READY"
                    ? "profit"
                    : readiness?.status === "SETUP_WAITING"
                      ? "warn"
                      : "neutral"
                }
              >
                {readiness?.status === "TRADE_READY"
                  ? "READY FOR EXECUTION"
                  : readiness?.status === "SETUP_WAITING"
                    ? "WAITING FOR CONFIRMATION"
                    : readiness?.status === "ANALYSIS_READY"
                      ? "ANALYSIS READY"
                      : "INCOMPLETE"}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              {readiness?.status === "TRADE_READY" ? (
                <div className="rounded border border-profit-border bg-profit-bg px-4 py-3 text-2xs text-profit-text">
                  All predefined confirmation and risk requirements are satisfied.
                  You may execute at your discretion.
                </div>
              ) : (
                <div className="rounded border border-warn-border bg-warn-bg px-4 py-3 text-2xs text-warn-text">
                  <div className="font-medium">Conditions not yet complete:</div>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {readiness?.items
                      .filter((i) => !i.complete)
                      .slice(0, 5)
                      .map((i) => (
                        <li key={i.key}>
                          {i.label}
                          {i.hint ? ` — ${i.hint}` : ""}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/journal?new=1&analysis=${analysis.id}`}>
                  <Button
                    disabled={readiness?.status !== "TRADE_READY"}
                    title={
                      readiness?.status !== "TRADE_READY"
                        ? "Complete all conditions before recording a trade"
                        : undefined
                    }
                  >
                    Take Trade
                  </Button>
                </Link>
                {todayTrades.length > 0 && (
                  <Badge tone="brand">
                    SESSION COMPLETE — 1/1 trade taken today
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>

          {/* DISCIPLINE */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-brand-600" />
                <CardTitle>Trading Discipline</CardTitle>
              </div>
              <Badge
                tone={
                  discipline.percent >= 90
                    ? "profit"
                    : discipline.percent >= 70
                      ? "warn"
                      : "loss"
                }
              >
                {formatPercent(discipline.percent, 0)}
              </Badge>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-2xs">
                {discipline.rules.map((r) => (
                  <li
                    key={r.key}
                    className="flex items-center gap-2 rounded border border-border bg-surface-soft px-3 py-2"
                  >
                    {r.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-profit-text" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-loss-text" />
                    )}
                    <span className="flex-1 text-ink-800">{r.label}</span>
                    {r.detail && (
                      <span className="text-3xs text-ink-500">{r.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* HOW WAS IT */}
          <Card>
            <CardHeader>
              <CardTitle>How to use</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-2xs text-ink-600">
              <p>
                This page validates the plan you wrote in Daily Analysis against
                your trading rules. It does not create a second plan.
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>
                  <strong>Daily Analysis</strong> — the plan
                </li>
                <li>
                  <strong>Trade Check</strong> — validation
                </li>
                <li>
                  <strong>Journal</strong> — execution record
                </li>
              </ul>
            </CardBody>
          </Card>

          {analyses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Journal</CardTitle>
                <Badge tone="neutral">{analyses.length}</Badge>
              </CardHeader>
              <CardBody>
                <p className="text-2xs text-ink-600">
                  You have {analyses.length} market reads recorded. Open the Analysis
                  page to review them.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn("tabular mt-0.5 text-xs font-semibold text-ink-900", valueClass)}>
        {value}
      </div>
    </div>
  );
}






