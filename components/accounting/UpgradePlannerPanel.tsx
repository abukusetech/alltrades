"use client";

import * as React from "react";
import { Calculator, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  AccountingPurchase,
  AccountingSettings,
  AccountingWithdrawal,
} from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

const SCENARIO_CONFIG = {
  conservative: { label: "Conservative", multiplier: 0.6, color: "text-warn-text" },
  moderate: { label: "Moderate", multiplier: 1.0, color: "text-brand-700" },
  optimistic: { label: "Optimistic", multiplier: 1.4, color: "text-profit-text" },
} as const;

type Scenario = keyof typeof SCENARIO_CONFIG;

export function UpgradePlannerPanel({
  accountFundBalance,
  businessCashBalance,
  purchases,
  withdrawals,
  settings,
  minimumReserve,
}: {
  accountFundBalance: number;
  businessCashBalance: number;
  purchases: AccountingPurchase[];
  withdrawals: AccountingWithdrawal[];
  settings: AccountingSettings | null;
  minimumReserve: number;
}) {
  const [scenario, setScenario] = React.useState<Scenario>("moderate");
  const [payoutAmount, setPayoutAmount] = React.useState("0");
  const [payoutsPerMonth, setPayoutsPerMonth] = React.useState("0");
  const [allocationPct, setAllocationPct] = React.useState(
    String(settings?.account_fund_percent ?? 50)
  );

  const sorted = React.useMemo(
    () => [...purchases].sort((a, b) => a.size - b.size),
    [purchases]
  );

  const nextStage = sorted.find((p) => p.status === "planned");

  const avgNetPayout = React.useMemo(() => {
    const paid = withdrawals.filter(
      (w) => w.status === "paid" && w.actual_net_received !== null
    );
    if (paid.length === 0) return null;
    return (
      paid.reduce((s, w) => s + Number(w.actual_net_received), 0) / paid.length
    );
  }, [withdrawals]);

  // Populate the estimate from real payout history when available.
  // Keep zero when there is no history rather than inventing a forecast.
  React.useEffect(() => {
    if (avgNetPayout !== null && payoutAmount === "0") {
      setPayoutAmount(avgNetPayout.toFixed(2));
    }
  }, [avgNetPayout, payoutAmount]);

  React.useEffect(() => {
    if (settings?.account_fund_percent != null) {
      setAllocationPct(String(settings.account_fund_percent));
    }
  }, [settings?.account_fund_percent]);

  const effectivePayout = React.useMemo(() => {
    const base = Number(payoutAmount) || 0;
    return base * SCENARIO_CONFIG[scenario].multiplier;
  }, [payoutAmount, scenario]);

  const contribPerPayout = React.useMemo(() => {
    return effectivePayout * (Number(allocationPct) / 100);
  }, [effectivePayout, allocationPct]);

  const nextPrice = nextStage ? Number(nextStage.price) : 0;
  const shortfall = Math.max(nextPrice - accountFundBalance, 0);

  const payoutsNeeded =
    contribPerPayout > 0 ? Math.ceil(shortfall / contribPerPayout) : null;

  const monthsNeeded = React.useMemo(() => {
    const perMonth = Number(payoutsPerMonth) || 0;
    if (payoutsNeeded === null || perMonth <= 0) return null;
    return Math.ceil(payoutsNeeded / perMonth);
  }, [payoutsNeeded, payoutsPerMonth]);

  const reserveAfterPurchase = businessCashBalance - nextPrice;
  const reserveWarning = reserveAfterPurchase < minimumReserve;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-brand-600" />
            <CardTitle>Upgrade Planner</CardTitle>
          </div>
          <Badge tone={reserveWarning ? "warn" : "brand"}>
            {reserveWarning ? "Reserve check" : "Ready"}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Account fund balance"
              value={formatCurrency(accountFundBalance)}
              tone="brand"
            />
            <Stat
              label="Next account price"
              value={nextStage ? formatCurrency(nextPrice) : "—"}
              hint={nextStage ? `$${nextStage.size.toLocaleString()}` : undefined}
            />
            <Stat
              label="Funding shortfall"
              value={shortfall > 0 ? formatCurrency(shortfall) : "Fully funded"}
              tone={shortfall === 0 ? "profit" : undefined}
            />
            <Stat
              label="Minimum reserve"
              value={formatCurrency(minimumReserve)}
            />
          </div>

          {reserveWarning && (
            <div className="flex items-start gap-2 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">Reserve check</div>
                <p className="mt-0.5">
                  After purchasing the next account, your business cash would be{" "}
                  {formatCurrency(reserveAfterPurchase)}, below your configured minimum
                  of {formatCurrency(minimumReserve)}.
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <CardTitle>Scenario Planning</CardTitle>
          </div>
          <Badge tone="neutral">Estimates</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-800">
            These are <strong>estimates based on your inputs</strong>. Past
            payouts are not a guarantee of future payouts. Adjust the values to
            match your own assumptions.
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Scenario" htmlFor="scenario">
              <Select
                id="scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as Scenario)}
                options={[
                  { value: "conservative", label: "Conservative" },
                  { value: "moderate", label: "Moderate" },
                  { value: "optimistic", label: "Optimistic" },
                ]}
              />
            </Field>
            <Field
              label="Expected payout ($)"
              htmlFor="payout"
              hint={
                avgNetPayout !== null
                  ? `Your historical avg: ${formatCurrency(avgNetPayout)}`
                  : undefined
              }
            >
              <Input
                id="payout"
                type="number"
                step="0.01"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </Field>
            <Field label="Payouts per month" htmlFor="per_month">
              <Input
                id="per_month"
                type="number"
                step="1"
                value={payoutsPerMonth}
                onChange={(e) => setPayoutsPerMonth(e.target.value)}
              />
            </Field>
            <Field
              label="To account fund (%)"
              htmlFor="alloc_pct"
              hint={`= ${formatCurrency(contribPerPayout)} per payout`}
            >
              <Input
                id="alloc_pct"
                type="number"
                step="0.01"
                value={allocationPct}
                onChange={(e) => setAllocationPct(e.target.value)}
                suffix="%"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Effective payout (scenario)"
              value={formatCurrency(effectivePayout)}
              tone="brand"
            />
            <Stat
              label="Payouts to fund next"
              value={payoutsNeeded !== null ? String(payoutsNeeded) : "—"}
              hint={
                payoutsNeeded === null ? "Set a contribution above $0" : undefined
              }
            />
            <Stat
              label="Months to next account"
              value={monthsNeeded !== null ? String(monthsNeeded) : "—"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(["conservative", "moderate", "optimistic"] as Scenario[]).map((s) => {
              const cfg = SCENARIO_CONFIG[s];
              const eff = (Number(payoutAmount) || 0) * cfg.multiplier;
              const contrib = eff * (Number(allocationPct) / 100);
              const needed = contrib > 0 ? Math.ceil(shortfall / contrib) : null;
              return (
                <div
                  key={s}
                  className={`rounded border border-border bg-surface-soft p-3 text-2xs ${
                    scenario === s ? "ring-1 ring-brand-500" : ""
                  }`}
                >
                  <div className={`font-medium ${cfg.color}`}>{cfg.label}</div>
                  <div className="mt-1 text-ink-600">
                    Payout: {formatCurrency(eff)}
                  </div>
                  <div className="text-ink-600">
                    Contribution: {formatCurrency(contrib)}
                  </div>
                  <div className="mt-1 font-semibold text-ink-900">
                    {needed !== null
                      ? `${needed} payouts to fund $${nextStage?.size.toLocaleString() ?? ""}`
                      : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "profit";
}) {
  const valueClass =
    tone === "brand"
      ? "text-brand-700"
      : tone === "profit"
        ? "text-profit-text"
        : "text-ink-900";
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`tabular mt-0.5 text-sm font-semibold ${valueClass}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-3xs text-ink-500">{hint}</div>}
    </div>
  );
}
