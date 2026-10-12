"use client";

import * as React from "react";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Building2,
  User,
} from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import {
  useTrades,
  useWithdrawals,
} from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import {
  computePositionForAccount,
} from "@/lib/accounts/position-calc";
import {
  getMavenRules,
  getPersonalRules,
  accountTypeLabel,
  accountTypeTone,
} from "@/lib/accounts/rules";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { INSTRUMENTS } from "@/lib/constants";
import {
  cn,
  formatCurrency,
  formatPercent,
  parseNumberOrNull,
} from "@/lib/utils";

export function PositionCalculatorClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const [instrument, setInstrument] = React.useState("EURUSD");
  const [entry, setEntry] = React.useState("");
  const [stopLoss, setStopLoss] = React.useState("");
  const [takeProfit, setTakeProfit] = React.useState("");

  const result = React.useMemo(() => {
    if (!currentAccount) return null;
    return computePositionForAccount({
      account: currentAccount,
      instrument,
      entry: parseNumberOrNull(entry),
      stopLoss: parseNumberOrNull(stopLoss),
      takeProfit: parseNumberOrNull(takeProfit),
    });
  }, [currentAccount, instrument, entry, stopLoss, takeProfit]);

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Position Calculator"
          subtitle="Position size, TP and potential profit before you enter."
        />
        <EmptyState
          title="No account selected"
          description="Create an account first in Settings."
        />
      </div>
    );
  }

  const isMaven = currentAccount.account_type === "MAVEN";
  const isPersonal = currentAccount.account_type === "PERSONAL";
  const isUnclassified = currentAccount.account_type === "UNCLASSIFIED";

  const mavenRules = isMaven ? getMavenRules(currentAccount) : null;
  const personalRules = isPersonal ? getPersonalRules(currentAccount) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Position Calculator"
        subtitle={
          isMaven
            ? "Sizing uses Maven Instant Funding rules."
            : isPersonal
              ? "Sizing uses your Personal Trading Plan."
              : "Sizing uses generic defaults — set the account type in Settings."
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Entry" htmlFor="pc_entry">
                <Input
                  id="pc_entry"
                  type="number"
                  step="any"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="1.1235"
                />
              </Field>
              <Field label="Stop loss" htmlFor="pc_sl">
                <Input
                  id="pc_sl"
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="1.1247"
                />
              </Field>
              <Field label="Take profit" htmlFor="pc_tp">
                <Input
                  id="pc_tp"
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="1.1211"
                />
              </Field>
            </div>

            <div className="rounded border border-border bg-surface-soft px-3 py-2 text-3xs text-ink-500">
              Account size:{" "}
              <span className="tabular text-ink-800">
                {formatCurrency(Number(currentAccount.starting_capital))}
              </span>
              {" · "}
              Risk source:{" "}
              <span className="text-ink-800">
                {isMaven
                  ? "Maven rules"
                  : isPersonal
                    ? "Personal plan"
                    : "Generic default"}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            {result && (
              <Badge
                tone={
                  result.warnings.length === 0
                    ? "profit"
                    : "warn"
                }
              >
                {result.warnings.length === 0
                  ? "Within limits"
                  : `${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}`}
              </Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            {result?.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <Stat
                label={`Risk (${result?.riskPercentUsed?.toFixed(2) ?? "—"}%)`}
                value={
                  result?.riskAmount != null
                    ? formatCurrency(result.riskAmount)
                    : "—"
                }
              />
              <Stat
                label="SL distance"
                value={
                  result?.slPips != null ? `${result.slPips} pips` : "—"
                }
              />
              <Stat
                label="TP distance"
                value={
                  result?.tpPips != null ? `${result.tpPips} pips` : "—"
                }
              />
              <Stat
                label="R:R"
                value={result?.rr != null ? `1:${result.rr.toFixed(2)}` : "—"}
                valueClass={
                  result?.rr != null && result.rr < 2
                    ? "text-warn-text"
                    : undefined
                }
              />
              <Stat
                label="Lot size"
                value={result?.lots != null ? result.lots.toFixed(2) : "—"}
                valueClass="text-brand-700"
              />
              <Stat
                label="Potential profit"
                value={
                  result?.potentialProfit != null
                    ? formatCurrency(result.potentialProfit)
                    : "—"
                }
                valueClass="text-profit-text"
              />
            </div>

            {/* Type-aware rules panel */}
            {isMaven && mavenRules && (
              <div className="space-y-1.5 border-t border-border pt-3 text-2xs">
                <div className="flex items-center gap-1.5 text-3xs font-medium uppercase tracking-wide text-brand-700">
                  <Building2 className="h-3.5 w-3.5" />
                  Maven Instant Funding rules
                </div>
                <Row
                  label="Daily drawdown"
                  value={
                    mavenRules.dailyLossPercent != null
                      ? formatPercent(mavenRules.dailyLossPercent, 0)
                      : "Not configured"
                  }
                />
                <Row
                  label="Trailing drawdown"
                  value={
                    mavenRules.maxDrawdownPercent != null
                      ? formatPercent(mavenRules.maxDrawdownPercent, 0)
                      : "Not configured"
                  }
                />
                <Row
                  label="Max risk per trade"
                  value={
                    mavenRules.maxRiskPerTradePercent != null
                      ? formatPercent(mavenRules.maxRiskPerTradePercent, 0)
                      : "Not configured"
                  }
                />
                <Row
                  label="Consistency limit"
                  value={
                    mavenRules.maxConsistencyPercent != null
                      ? formatPercent(mavenRules.maxConsistencyPercent, 0)
                      : "Not configured"
                  }
                />
                <Row
                  label="Profit split"
                  value={
                    mavenRules.profitSplitPercent != null
                      ? formatPercent(mavenRules.profitSplitPercent, 0)
                      : "Not configured"
                  }
                />
              </div>
            )}

            {isPersonal && personalRules && (
              <div className="space-y-1.5 border-t border-border pt-3 text-2xs">
                <div className="flex items-center gap-1.5 text-3xs font-medium uppercase tracking-wide text-profit-text">
                  <User className="h-3.5 w-3.5" />
                  Your Personal Trading Plan
                </div>
                <Row
                  label="Default risk"
                  value={
                    personalRules.riskPercentPerTrade != null
                      ? formatPercent(personalRules.riskPercentPerTrade, 2)
                      : "Not configured"
                  }
                />
                <Row
                  label="Daily loss cap"
                  value={
                    personalRules.dailyLossPercent != null
                      ? formatPercent(personalRules.dailyLossPercent, 2)
                      : "Not configured"
                  }
                />
                <Row
                  label="Max drawdown"
                  value={
                    personalRules.maxDrawdownPercent != null
                      ? formatPercent(personalRules.maxDrawdownPercent, 2)
                      : "Not configured"
                  }
                />
                <Row
                  label="Min R:R"
                  value={
                    currentAccount.personal_risk_percent != null
                      ? "See plan"
                      : "See plan"
                  }
                />
              </div>
            )}

            {isUnclassified && (
              <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
                This account is not classified. Set its type in Settings →
                Classify your accounts for accurate sizing.
              </div>
            )}

            {result?.complete && result.warnings.length === 0 && (
              <div className="flex items-center gap-2 rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
                <CheckCircle2 className="h-4 w-4" />
                Sizing is within the configured limits.
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
      <div className="text-3xs uppercase tracking-wide text-ink-500">
        {label}
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-600">{label}</span>
      <span className="tabular text-ink-900">{value}</span>
    </div>
  );
}
