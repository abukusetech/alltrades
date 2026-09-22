"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Target,
  TrendingUp,
  Award,
} from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import {
  useAnalyses,
  useTrades,
  useWithdrawals,
} from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import {
  computeDailyRiskUsage,
  computeDisciplineScore,
  computeMonthlyCounter,
  computeMonthlyPerformance,
  computeSetupScore,
  computeTradeCheck,
  computeSetupScore as computeSQ,
  analyzeSessions,
  formatRR,
  type SetupChecklistItem,
  type TradeCheckInput,
} from "@/lib/data/discipline";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { INSTRUMENTS } from "@/lib/constants";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { Trade } from "@/lib/types";

const DEFAULT_CHECKLIST: SetupChecklistItem[] = [
  { key: "structure", label: "Structure confirmed", checked: false },
  { key: "liquidity", label: "Liquidity taken", checked: false },
  { key: "entry", label: "Entry confirmation", checked: false },
  { key: "news", label: "No major news", checked: false },
  { key: "rr", label: "RR ≥ 1:2", checked: false },
  { key: "instrument", label: "Correct instrument", checked: false },
  { key: "session", label: "Session valid", checked: false },
];

export function TradeCheckClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const { data: analyses = [] } = useAnalyses(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  // Setup checklist (local UI state — resets on refresh)
  const [checklist, setChecklist] = React.useState<SetupChecklistItem[]>(
    DEFAULT_CHECKLIST
  );

  // Trade check inputs
  const [checkInstrument, setCheckInstrument] = React.useState("");
  const [checkNews, setCheckNews] = React.useState(false);
  const [checkSetup, setCheckSetup] = React.useState(false);
  const [checkRisk, setCheckRisk] = React.useState(false);
  const [checkRR, setCheckRR] = React.useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTrades = React.useMemo(
    () => trades.filter((t) => t.trade_date === todayKey),
    [trades, todayKey]
  );
  const todayPnL = React.useMemo(
    () => todayTrades.reduce((s, t) => s + (Number(t.profit_loss) || 0), 0),
    [todayTrades]
  );

  const riskUsage = React.useMemo(
    () =>
      computeDailyRiskUsage(
        todayPnL,
        metrics.currentCapital,
        0.25 // 0.25% per trade, matches the pre-trade rule
      ),
    [todayPnL, metrics.currentCapital]
  );

  const setupScore = React.useMemo(
    () => computeSetupScore(checklist),
    [checklist]
  );

  const monthly = React.useMemo(
    () => computeMonthlyCounter(trades, new Date().getFullYear(), new Date().getMonth(), 12),
    [trades]
  );

  const discipline = React.useMemo(
    () =>
      computeDisciplineScore({
        trades,
        account: currentAccount!,
        currentCapital: metrics.currentCapital,
        rules: {
          maxTradesPerDay: 1,
          allowedInstrument: "EURUSD",
          maxRiskPercentPerTrade: 0.25,
          forbiddenOnNews: true,
          minRR: 2,
          maxTradesPerMonth: 12,
        },
      }),
    [trades, currentAccount, metrics.currentCapital]
  );

  const tradeCheck = React.useMemo<TradeCheckResultSafe>(() => {
    const input: TradeCheckInput = {
      instrument: checkInstrument || null,
      allowedInstrument: "EURUSD",
      newsClear: checkNews,
      setupConfirmed: checkSetup,
      riskWithinLimit: checkRisk,
      rrMeetsMinimum: checkRR,
      tradedToday: todayTrades.length > 0,
    };
    return computeTradeCheck(input);
  }, [
    checkInstrument,
    checkNews,
    checkSetup,
    checkRisk,
    checkRR,
    todayTrades.length,
  ]);

  const monthlyPerf = React.useMemo(() => {
    if (!currentAccount) return null;
    return computeMonthlyPerformance(
      trades,
      currentAccount,
      metrics.currentCapital,
      discipline.percent,
      12,
      4
    );
  }, [trades, currentAccount, metrics.currentCapital, discipline.percent]);

  const sessions = React.useMemo(() => analyzeSessions(trades), [trades]);

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Trade Check"
          subtitle="Pre-trade checklist, discipline score and monthly plan."
        />
        <EmptyState
          title="No account selected"
          description="Create an account in Settings first."
        />
      </div>
    );
  }

  if (isLoading && trades.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Trade Check"
          subtitle="Pre-trade checklist, discipline score and monthly plan."
        />
        <BlockLoader label="Loading your trade plan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Check"
        subtitle="Pre-trade checklist, discipline score and monthly plan."
      />

      <AccountHeader
        account={currentAccount}
        currentCapital={metrics.currentCapital}
      />

      {/* ---- SHOULD I TRADE? ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-brand-600" />
            <CardTitle>Trade Check</CardTitle>
          </div>
          <Badge
            tone={
              tradeCheck.status === "READY"
                ? "profit"
                : tradeCheck.status === "SESSION_COMPLETE"
                  ? "brand"
                  : "warn"
            }
          >
            {tradeCheck.status.replace("_", " ")}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tradeCheck.items.map((item) => (
              <div
                key={item.key}
                className={cn(
                  "flex items-center gap-2 rounded border px-3 py-2 text-2xs",
                  item.passed
                    ? "border-profit-border bg-profit-bg text-profit-text"
                    : "border-ink-200 bg-surface-soft text-ink-600"
                )}
              >
                {item.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.hint && (
                  <span className="text-3xs opacity-70">{item.hint}</span>
                )}
              </div>
            ))}
          </div>

          <div
            className={cn(
              "rounded border px-3 py-2 text-2xs font-semibold uppercase tracking-wide",
              tradeCheck.status === "READY"
                ? "border-profit-border bg-profit-bg text-profit-text"
                : tradeCheck.status === "SESSION_COMPLETE"
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-warn-border bg-warn-bg text-warn-text"
            )}
          >
            {tradeCheck.message}
          </div>

          {/* Inputs to toggle the check */}
          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Instrument" htmlFor="check_instrument">
              <Select
                id="check_instrument"
                value={checkInstrument}
                onChange={(e) => setCheckInstrument(e.target.value)}
                options={["", ...INSTRUMENTS] as unknown as string[]}
                placeholder="Select instrument"
              />
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-1">
              <span className="text-2xs font-medium uppercase tracking-wide text-ink-600">
                Confirmations
              </span>
              <Toggle label="News clear" value={checkNews} onChange={setCheckNews} />
              <Toggle label="Setup confirmed" value={checkSetup} onChange={setCheckSetup} />
              <Toggle label="Risk ≤ 0.25%" value={checkRisk} onChange={setCheckRisk} />
              <Toggle label="RR ≥ 1:2" value={checkRR} onChange={setCheckRR} />
            </div>
            <div className="rounded border border-border bg-surface-soft p-3">
              <div className="text-3xs uppercase tracking-wide text-ink-500">
                Trades taken today
              </div>
              <div className="tabular mt-0.5 text-lg font-semibold text-ink-900">
                {todayTrades.length}
              </div>
              <div className="text-3xs text-ink-500">
                {todayTrades.length > 0
                  ? "Stop — session complete."
                  : "1 trade per day plan."}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ---- RISK USED ---- */}
      <RiskUsedCard riskUsage={riskUsage} />

      {/* ---- DISCIPLINE ---- */}
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
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-2xs text-ink-600">
              {discipline.passed} of {discipline.total} rules currently passing
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                discipline.percent >= 90
                  ? "bg-profit"
                  : discipline.percent >= 70
                    ? "bg-warn"
                    : "bg-loss"
              )}
              style={{ width: `${discipline.percent}%` }}
            />
          </div>
          <ul className="mt-2 divide-y divide-border rounded border border-border">
            {discipline.rules.map((r) => (
              <li
                key={r.key}
                className="flex items-center gap-2 px-3 py-2 text-2xs"
              >
                {r.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-profit-text" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-loss-text" />
                )}
                <span className="min-w-0 flex-1 text-ink-800">{r.label}</span>
                {r.detail && (
                  <span className="text-3xs text-ink-500">{r.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* ---- SETUP CHECKLIST ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brand-600" />
            <CardTitle>Setup Quality Score</CardTitle>
          </div>
          <Badge
            tone={
              setupScore.percent >= 85
                ? "profit"
                : setupScore.percent >= 70
                  ? "warn"
                  : "loss"
            }
          >
            {setupScore.label}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="text-2xs text-ink-600">
            Tick each condition as you confirm it before entering.
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checklist.map((c, i) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded border border-border bg-surface-soft px-3 py-2 text-2xs hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={c.checked}
                  onChange={(e) => {
                    const next = [...checklist];
                    next[i] = { ...c, checked: e.target.checked };
                    setChecklist(next);
                  }}
                  className="h-3.5 w-3.5 rounded border-border-strong"
                />
                <span className="text-ink-800">{c.label}</span>
              </label>
            ))}
          </div>

          <div className="rounded border border-border bg-surface-soft px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="text-2xs font-semibold text-ink-900">
                SETUP SCORE: {setupScore.passed}/{setupScore.total} —{" "}
                {setupScore.label}
              </div>
              <span className="tabular text-2xs text-ink-600">
                {setupScore.percent.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={cn(
                  "h-full transition-all",
                  setupScore.percent >= 85
                    ? "bg-profit"
                    : setupScore.percent >= 70
                      ? "bg-warn"
                      : "bg-loss"
                )}
                style={{ width: `${setupScore.percent}%` }}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ---- MONTHLY COUNTER ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Monthly Counter</CardTitle>
          <Badge tone={monthly.reached ? "warn" : "neutral"}>
            {monthly.trades} / {monthly.cap}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: monthly.cap }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-3 flex-1 rounded-sm",
                  i < monthly.trades ? "bg-brand-600" : "bg-ink-100"
                )}
                title={`Trade ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-2xs">
            <span className="text-ink-600">
              {monthly.reached
                ? "Monthly plan complete."
                : `${monthly.remaining} trade${monthly.remaining > 1 ? "s" : ""} remaining`}
            </span>
            <span className="tabular text-ink-500">
              {monthly.percent.toFixed(0)}%
            </span>
          </div>
        </CardBody>
      </Card>

      {/* ---- BEST SESSION ---- */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              <CardTitle>Best Trading Session</CardTitle>
            </div>
            <Badge tone="neutral">{sessions.length} session{sessions.length > 1 ? "s" : ""}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Session</th>
                    <th className="px-4 py-2 text-right font-medium">Trades</th>
                    <th className="px-4 py-2 text-right font-medium">Win rate</th>
                    <th className="px-4 py-2 text-right font-medium">Avg RR</th>
                    <th className="px-4 py-2 text-right font-medium">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map((s) => {
                    const pnlClass =
                      s.pnl > 0
                        ? "text-profit-text"
                        : s.pnl < 0
                          ? "text-loss-text"
                          : "text-ink-700";
                    return (
                      <tr key={s.session} className="hover:bg-surface-soft">
                        <td className="px-4 py-2.5 text-xs font-medium text-ink-900">
                          {s.session}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                          {s.trades}
                          <span className="ml-1 text-3xs text-ink-400">
                            ({s.wins}W · {s.losses}L)
                          </span>
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                          {s.winRate !== null ? formatPercent(s.winRate, 1) : "—"}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                          {formatRR(s.avgRR)}
                        </td>
                        <td className={cn("tabular px-4 py-2.5 text-right text-xs font-semibold", pnlClass)}>
                          {formatCurrency(s.pnl, { showSign: true })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ---- MONTHLY PERFORMANCE ---- */}
      {monthlyPerf && (
        <MonthlyPerformanceCard perf={monthlyPerf} />
      )}

      {/* ---- ANALYSES COUNT ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Journal</CardTitle>
          <Badge tone="neutral">{analyses.length} recorded</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-2xs text-ink-600">
            {analyses.length > 0
              ? `You have ${analyses.length} market reads recorded. Use the Analysis page to review whether they played out.`
              : "No market reads recorded yet. Build your bias before every trade."}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

type TradeCheckResultSafe = ReturnType<typeof computeTradeCheck>;

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-2xs text-ink-800">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border-strong"
      />
      {label}
    </label>
  );
}

function RiskUsedCard({
  riskUsage,
}: {
  riskUsage: ReturnType<typeof computeDailyRiskUsage>;
}) {
  const barClass =
    riskUsage.level === "breached"
      ? "bg-loss"
      : riskUsage.level === "approaching"
        ? "bg-warn"
        : "bg-profit";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Risk Used Today</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            0.25% per-trade risk budget on current capital
          </p>
        </div>
        <Badge
          tone={
            riskUsage.level === "breached"
              ? "loss"
              : riskUsage.level === "approaching"
                ? "warn"
                : "profit"
          }
        >
          {riskUsage.level === "breached"
            ? "Breached"
            : riskUsage.level === "approaching"
              ? "Approaching"
              : "Within limit"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-2xs text-ink-600">
            {formatCurrency(riskUsage.riskUsed)} of{" "}
            {formatCurrency(riskUsage.riskBudget)} used
          </div>
          <div className="tabular text-sm font-semibold text-ink-900">
            {riskUsage.riskUsagePercent.toFixed(1)}%
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className={cn("h-full transition-all", barClass)}
            style={{ width: `${riskUsage.riskUsagePercent}%` }}
          />
        </div>
        <div className="text-3xs text-ink-500">
          {formatCurrency(riskUsage.riskRemaining)} remaining of today&apos;s budget
        </div>
      </CardBody>
    </Card>
  );
}

function MonthlyPerformanceCard({
  perf,
}: {
  perf: ReturnType<typeof computeMonthlyPerformance>;
}) {
  const returnClass =
    perf.returnPercent > 0
      ? "text-profit-text"
      : perf.returnPercent < 0
        ? "text-loss-text"
        : "text-ink-900";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{perf.monthLabel}</CardTitle>
        <Badge tone={perf.returnPercent >= perf.targetPercent ? "profit" : "neutral"}>
          {perf.returnPercent >= perf.targetPercent ? "Target reached" : "In progress"}
        </Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Starting Balance" value={formatCurrency(perf.startingBalance)} />
          <Stat label="Current Balance" value={formatCurrency(perf.currentBalance)} />
          <Stat
            label="Return"
            value={`${perf.returnPercent >= 0 ? "+" : ""}${perf.returnPercent.toFixed(2)}%`}
            valueClass={returnClass}
          />
          <Stat label="Target" value={`${perf.targetPercent.toFixed(2)}%`} />
          <Stat label="Trades" value={`${perf.trades} / ${perf.tradesCap}`} />
          <Stat label="Wins" value={String(perf.wins)} />
          <Stat label="Losses" value={String(perf.losses)} />
          <Stat
            label="Win Rate"
            value={perf.winRate !== null ? formatPercent(perf.winRate, 1) : "—"}
          />
          <Stat label="Average RR" value={formatRR(perf.averageRR)} />
          <Stat
            label="Profit Factor"
            value={perf.profitFactor !== null ? perf.profitFactor.toFixed(2) : "—"}
          />
          <Stat
            label="Discipline"
            value={formatPercent(perf.disciplinePercent, 0)}
          />
          <Stat label="Breakeven" value={String(perf.breakeven)} />
        </div>

        {/* Monthly target progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-2xs text-ink-600">
            <span>Monthly progress</span>
            <span className="tabular">
              {perf.returnPercent.toFixed(2)}% / {perf.targetPercent.toFixed(2)}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                perf.returnPercent >= perf.targetPercent
                  ? "bg-profit"
                  : perf.returnPercent > 0
                    ? "bg-brand-600"
                    : "bg-ink-400"
              )}
              style={{
                width: `${Math.min(100, Math.max(0, (perf.returnPercent / perf.targetPercent) * 100))}%`,
              }}
            />
          </div>
        </div>
      </CardBody>
    </Card>
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
      <div
        className={cn(
          "tabular mt-0.5 text-sm font-semibold text-ink-900",
          valueClass
        )}
      >
        {value}
      </div>
    </div>
  );
}
