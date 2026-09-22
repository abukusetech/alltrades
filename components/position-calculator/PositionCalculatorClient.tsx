"use client";

import * as React from "react";
import { Calculator, CheckCircle2, XCircle } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { computePosition } from "@/lib/position-calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { INSTRUMENTS } from "@/lib/constants";
import { cn, formatCurrency, formatPercent, parseNumberOrNull } from "@/lib/utils";

export function PositionCalculatorClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const [instrument, setInstrument] = React.useState<string>("EURUSD");
  const [riskPercent, setRiskPercent] = React.useState("0.25");
  const [slPips, setSlPips] = React.useState("12");
  const [rr, setRr] = React.useState("2");

  const result = React.useMemo(() => {
    const risk = parseNumberOrNull(riskPercent) ?? 0;
    const sl = parseNumberOrNull(slPips) ?? 0;
    const r = parseNumberOrNull(rr) ?? 0;
    return computePosition({
      accountSize: metrics.currentCapital,
      riskPercent: risk,
      stopLossPips: sl,
      rr: r,
      instrument,
    });
  }, [metrics.currentCapital, riskPercent, slPips, rr, instrument]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Position Calculator"
        subtitle="Position size, TP and potential profit before you enter."
      />

      {!currentAccount ? (
        <EmptyState
          title="No account selected"
          description="Create an account first in Settings."
        />
      ) : (
        <>
          <AccountHeader
            account={currentAccount}
            currentCapital={metrics.currentCapital}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Inputs */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-brand-600" />
                  <CardTitle>Inputs</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <Field label="Instrument" htmlFor="pc_instrument">
                  <Select
                    id="pc_instrument"
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    options={INSTRUMENTS as unknown as string[]}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Risk %" htmlFor="pc_risk">
                    <Input
                      id="pc_risk"
                      type="number"
                      step="0.01"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(e.target.value)}
                      suffix="%"
                    />
                  </Field>
                  <Field label="Stop Loss (pips)" htmlFor="pc_sl">
                    <Input
                      id="pc_sl"
                      type="number"
                      step="0.1"
                      value={slPips}
                      onChange={(e) => setSlPips(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Risk : Reward" htmlFor="pc_rr">
                  <Select
                    id="pc_rr"
                    value={rr}
                    onChange={(e) => setRr(e.target.value)}
                    options={["1", "1.5", "2", "2.5", "3", "4", "5"]}
                  />
                </Field>

                <div className="rounded border border-border bg-surface-soft px-3 py-2 text-3xs text-ink-500">
                  Account size: <span className="tabular text-ink-800">{formatCurrency(metrics.currentCapital)}</span>
                </div>
              </CardBody>
            </Card>

            {/* Output */}
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <Badge tone={result.approved ? "profit" : "loss"}>
                  {result.approved ? "RISK APPROVED" : "RISK TOO HIGH"}
                </Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-2 rounded border px-3 py-2 text-2xs"
                  style={{
                    borderColor: result.approved ? "#bbf7d0" : "#fecaca",
                    backgroundColor: result.approved ? "#f0fdf4" : "#fef2f2",
                    color: result.approved ? "#15803d" : "#b91c1c",
                  }}
                >
                  {result.approved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>{result.reason}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Risk amount" value={formatCurrency(result.riskAmount)} />
                  <Stat label="Pip value" value={formatCurrency(result.perPipValue)} />
                  <Stat label="Lot size" value={result.lots.toFixed(4)} />
                  <Stat
                    label="Rounded lots"
                    value={result.lotsRounded.toFixed(2)}
                    valueClass="text-brand-700"
                  />
                  <Stat label="Take profit (pips)" value={String(result.takeProfitPips)} />
                  <Stat
                    label="Potential profit"
                    value={formatCurrency(result.potentialProfit)}
                    valueClass="text-profit-text"
                  />
                  <Stat
                    label="Potential return"
                    value={formatPercent(result.potentialReturnPercent, 2)}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
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
      <div className={cn("tabular mt-0.5 text-sm font-semibold text-ink-900", valueClass)}>
        {value}
      </div>
    </div>
  );
}
