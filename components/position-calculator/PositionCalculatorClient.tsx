"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Calculator, AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { computePosition } from "@/lib/position-math";
import { useDailyAnalysis } from "@/lib/data/daily-analysis-hooks";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn, formatCurrency, parseNumberOrNull, toDateKey } from "@/lib/utils";

export function PositionCalculatorClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const searchParams = useSearchParams();
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const today = toDateKey(new Date());
  const analysisInstrument = overrideInstrument ?? "EURUSD";
  const { data: analysis } = useDailyAnalysis(currentAccountId, today, analysisInstrument);

  const [overrideInstrument, setOverrideInstrument] =
    React.useState<"EURUSD" | "XAUUSD" | null>(() => searchParams.get("instrument") === "XAUUSD" ? "XAUUSD" : null);
  const [overrideDirection, setOverrideDirection] =
    React.useState<"BUY" | "SELL" | null>(null);
  const [overrideEntry, setOverrideEntry] = React.useState<string>("");
  const [overrideSl, setOverrideSl] = React.useState<string>("");
  const [overrideTp, setOverrideTp] = React.useState<string>("");
  const [overrideRisk, setOverrideRisk] = React.useState<string>("");

  const instrument: "EURUSD" | "XAUUSD" =
    overrideInstrument ??
    (analysis?.instrument === "XAUUSD" || analysis?.instrument === "XAUUSD / Gold"
      ? "XAUUSD"
      : "EURUSD");

  const direction =
    overrideDirection ??
    (analysis?.planned_direction === "BUY" || analysis?.planned_direction === "SELL"
      ? analysis.planned_direction
      : null);

  const entry =
    overrideEntry !== ""
      ? parseNumberOrNull(overrideEntry)
      : analysis?.planned_entry ?? null;
  const sl =
    overrideSl !== ""
      ? parseNumberOrNull(overrideSl)
      : analysis?.planned_stop_loss ?? null;
  const tp =
    overrideTp !== ""
      ? parseNumberOrNull(overrideTp)
      : analysis?.planned_take_profit ?? null;
  const riskPct =
    overrideRisk !== ""
      ? parseNumberOrNull(overrideRisk) ?? 0
      : analysis?.planned_risk_percent ?? 0.5;

  const balance =
    metrics.currentCapital > 0
      ? metrics.currentCapital
      : Number(currentAccount?.starting_capital ?? 0);

  const result = computePosition({
    instrument,
    direction,
    entry,
    stopLoss: sl,
    takeProfit: tp,
    riskPercent: riskPct,
    balance,
    account: currentAccount,
  });

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader title="Position Calculator" />
        <EmptyState title="No account selected" description="Create one in Settings." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Position Calculator"
        subtitle="Sized from today's saved Daily Analysis. Change an input to override for this calculation only."
        actions={
          analysis ? (
            <Badge tone="brand">
              <Link2 className="mr-1 h-3 w-3" /> Linked to today's analysis
            </Badge>
          ) : (
            <Badge tone="warn">No analysis saved for today</Badge>
          )
        }
      />

      <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-brand-600" />
              <CardTitle>Inputs</CardTitle>
            </div>
            <Badge tone="neutral">{instrument}</Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Instrument" htmlFor="pc_instrument">
                <Select
                  id="pc_instrument"
                  value={instrument}
                  onChange={(e) =>
                    setOverrideInstrument(e.target.value as "EURUSD" | "XAUUSD")
                  }
                  options={["EURUSD", "XAUUSD"]}
                />
              </Field>
              <Field label="Direction" htmlFor="pc_dir">
                <Select
                  id="pc_dir"
                  value={direction ?? ""}
                  onChange={(e) =>
                    setOverrideDirection(
                      e.target.value === "BUY" || e.target.value === "SELL"
                        ? (e.target.value as "BUY" | "SELL")
                        : null
                    )
                  }
                  options={["BUY", "SELL"]}
                  placeholder="Select"
                />
              </Field>
              <Field label="Risk %" htmlFor="pc_risk">
                <Input
                  id="pc_risk"
                  type="number"
                  step="0.01"
                  value={overrideRisk !== "" ? overrideRisk : String(riskPct || "")}
                  onChange={(e) => setOverrideRisk(e.target.value)}
                  suffix="%"
                />
              </Field>
              <Field label="Balance" htmlFor="pc_bal">
                <Input id="pc_bal" value={formatCurrency(balance)} disabled />
              </Field>
              <Field label="Entry" htmlFor="pc_entry">
                <Input
                  id="pc_entry"
                  type="number"
                  step="any"
                  value={
                    overrideEntry !== ""
                      ? overrideEntry
                      : entry !== null
                        ? String(entry)
                        : ""
                  }
                  onChange={(e) => setOverrideEntry(e.target.value)}
                />
              </Field>
              <Field label="Stop loss" htmlFor="pc_sl">
                <Input
                  id="pc_sl"
                  type="number"
                  step="any"
                  value={
                    overrideSl !== ""
                      ? overrideSl
                      : sl !== null
                        ? String(sl)
                        : ""
                  }
                  onChange={(e) => setOverrideSl(e.target.value)}
                />
              </Field>
              <Field label="Take profit" htmlFor="pc_tp">
                <Input
                  id="pc_tp"
                  type="number"
                  step="any"
                  value={
                    overrideTp !== ""
                      ? overrideTp
                      : tp !== null
                        ? String(tp)
                        : ""
                  }
                  onChange={(e) => setOverrideTp(e.target.value)}
                />
              </Field>
            </div>

            {!result.complete && result.reason && (
              <div className="flex items-start gap-2 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{result.reason}</span>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <Badge tone={result.complete ? "profit" : "warn"}>
              {result.complete ? "Complete" : "Incomplete"}
            </Badge>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Risk amount"
                value={result.riskAmount !== null ? formatCurrency(result.riskAmount) : "—"}
              />
              <Stat
                label="Stop-loss distance"
                value={
                  result.slDistance !== null
                    ? result.slDistance.toFixed(instrument === "XAUUSD" ? 2 : 4)
                    : "—"
                }
              />
              <Stat
                label="Take-profit distance"
                value={
                  result.tpDistance !== null
                    ? result.tpDistance.toFixed(instrument === "XAUUSD" ? 2 : 4)
                    : "—"
                }
              />
              <Stat
                label="R:R"
                value={result.rr !== null ? `1:${result.rr.toFixed(2)}` : "—"}
                valueClass={
                  result.rr !== null && result.rr < 1.995 ? "text-loss-text" : "text-profit-text"
                }
              />
              <Stat
                label="Lot size"
                value={result.lotSize !== null ? result.lotSize.toFixed(2) : "—"}
                valueClass="text-brand-700"
              />
              <Stat
                label="Potential loss"
                value={result.riskAmount !== null ? formatCurrency(result.riskAmount) : "—"}
                valueClass="text-loss-text"
              />
              <Stat
                label="Potential profit"
                value={result.potentialProfit !== null ? formatCurrency(result.potentialProfit) : "—"}
                valueClass="text-profit-text"
              />
            </div>

            {result.complete && result.rr !== null && result.rr < 1.995 && (
              <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
                R:R below 1:2 — Trade Check will fail.
              </div>
            )}
            {result.complete && (
              <div className="flex items-center gap-2 rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
                <CheckCircle2 className="h-4 w-4" />
                <span>Position sized. Open Trade Check for the strict gate.</span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
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
      <div className={cn("tabular mt-0.5 text-sm font-semibold text-ink-900", valueClass)}>
        {value}
      </div>
    </div>
  );
}
