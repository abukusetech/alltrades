"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Circle } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { useDailyAnalysis } from "@/lib/data/daily-analysis-hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { computePosition } from "@/lib/position-math";
import { computeGate, type GateStatus, type GateCheck } from "@/lib/trade-check-gate";
import { PageHeader } from "@/components/layout/PageHeader";
import { WeeklyLockBanner } from "@/components/dashboard/WeeklyLockBanner";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, toDateKey } from "@/lib/utils";

const STATUS_LABEL: Record<GateStatus, string> = {
  ANALYSIS_INCOMPLETE: "ANALYSIS INCOMPLETE",
  WAITING_FOR_SETUP: "WAITING FOR SETUP",
  WAITING_FOR_CONFIRMATION: "WAITING FOR CONFIRMATION",
  BLOCKED: "BLOCKED",
  INVALIDATED: "INVALIDATED",
  READY: "READY — TRADE PERMITTED",
  TRADE_TAKEN: "TRADE TAKEN",
};

const STATUS_TONE: Record<GateStatus, "profit" | "loss" | "warn" | "neutral" | "brand"> = {
  ANALYSIS_INCOMPLETE: "neutral",
  WAITING_FOR_SETUP: "warn",
  WAITING_FOR_CONFIRMATION: "warn",
  BLOCKED: "loss",
  INVALIDATED: "loss",
  READY: "profit",
  TRADE_TAKEN: "brand",
};

export function TradeCheckClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const today = toDateKey(new Date());
  const { data: analysis, isLoading } = useDailyAnalysis(currentAccountId, today);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const position = React.useMemo(() => {
    if (!analysis) return null;
    const direction =
      analysis.planned_direction === "BUY" || analysis.planned_direction === "SELL"
        ? analysis.planned_direction
        : null;
    return computePosition({
      instrument: analysis.instrument,
      direction,
      entry: analysis.planned_entry,
      stopLoss: analysis.planned_stop_loss,
      takeProfit: analysis.planned_take_profit,
      riskPercent: analysis.planned_risk_percent ?? 0,
      balance: metrics.currentCapital,
      account: currentAccount,
    });
  }, [analysis, metrics.currentCapital, currentAccount]);

  const hasTradeToday = trades.some((t) => t.trade_date === today);

  const gate = React.useMemo(
    () => computeGate({ analysis: analysis ?? null, position, account: currentAccount, hasTradeToday }),
    [analysis, position, currentAccount, hasTradeToday]
  );

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader title="Trade Check" subtitle="Strict execution gate." />
        <EmptyState title="No account selected" description="Create one in Settings." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Check"
        subtitle="Strict execution gate. READY only when every condition is verified."
        actions={<Badge tone={STATUS_TONE[gate.status]}>{STATUS_LABEL[gate.status]}</Badge>}
      />

      <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
      <WeeklyLockBanner />

      {isLoading ? (
        <div className="py-12 text-center text-2xs text-ink-500">Loading today's analysis…</div>
      ) : !analysis ? (
        <EmptyState
          icon={<ClipboardCheck className="h-4 w-4" />}
          title="No analysis saved for today"
          description="Complete the Daily Analysis before running the gate."
          action={
            <Link href="/daily-analysis">
              <Button>Open Daily Analysis</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-brand-600" />
                <CardTitle>Execution Gate</CardTitle>
              </div>
              <Badge tone={STATUS_TONE[gate.status]}>{gate.checks.filter(c => c.status === "PASS").length} / {gate.checks.length}</Badge>
            </CardHeader>
            <CardBody className="space-y-2">
              {gate.checks.map((c) => (
                <CheckRow key={c.key} check={c} />
              ))}
            </CardBody>
          </Card>

          {gate.blockers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Blockers</CardTitle>
                <Badge tone="loss">{gate.blockers.length}</Badge>
              </CardHeader>
              <CardBody className="space-y-1.5">
                {gate.blockers.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Final Decision</CardTitle>
              <Badge tone={STATUS_TONE[gate.status]}>{STATUS_LABEL[gate.status]}</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              <div
                className={cn(
                  "rounded border px-3 py-2 text-2xs",
                  gate.ready
                    ? "border-profit-border bg-profit-bg text-profit-text"
                    : "border-loss-border bg-loss-bg text-loss-text"
                )}
              >
                {gate.ready
                  ? "All mandatory conditions passed. Proceed to the Journal to record the trade."
                  : `Blocked — ${gate.blockers.length} reason${gate.blockers.length === 1 ? "" : "s"} listed above.`}
              </div>
              {gate.ready && (
                <Link href={`/journal?analysis=${analysis.id}`}>
                  <Button>Open Journal to record trade</Button>
                </Link>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: GateCheck }) {
  const Icon =
    check.status === "PASS"
      ? CheckCircle2
      : check.status === "FAIL"
        ? XCircle
        : Circle;

  const tone =
    check.status === "PASS"
      ? "border-profit-border bg-profit-bg text-profit-text"
      : check.status === "FAIL"
        ? "border-loss-border bg-loss-bg text-loss-text"
        : "border-warn-border bg-warn-bg text-warn-text";

  return (
    <div className={cn("flex items-start gap-2 rounded border px-3 py-2 text-2xs", tone)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{check.label}</div>
        {check.reason && <div className="mt-0.5 text-3xs opacity-90">{check.reason}</div>}
      </div>
      <span className="shrink-0 text-3xs uppercase tracking-wide opacity-70">
        {check.status}
      </span>
    </div>
  );
}


