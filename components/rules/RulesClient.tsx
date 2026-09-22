"use client";

import * as React from "react";
import { ShieldCheck, AlertTriangle, ScrollText } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades } from "@/lib/data/hooks";
import { detectMistakes, computePerformanceScore } from "@/lib/rules";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockLoader } from "@/components/ui/Spinner";

export function RulesClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);

  const mistakes = React.useMemo(
    () => detectMistakes(currentAccount, trades),
    [currentAccount, trades]
  );

  const score = React.useMemo(
    () => computePerformanceScore(currentAccount, trades, mistakes),
    [currentAccount, trades, mistakes]
  );

  const violations = mistakes.filter((m) => m.severity === "violation");
  const warnings = mistakes.filter((m) => m.severity === "warn");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rules"
        subtitle="Prop-firm rules, your personal rules, and automatic violation detection."
      />

      {!currentAccount ? (
        <EmptyState
          title="No account selected"
          description="Create an account first in Settings."
        />
      ) : isLoading && trades.length === 0 ? (
        <BlockLoader label="Scanning your trades" />
      ) : (
        <>
          <AccountHeader
            account={currentAccount}
            currentCapital={Number(currentAccount.starting_capital)}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                <CardTitle>Trading Discipline Score</CardTitle>
              </div>
              <Badge
                tone={
                  score.total >= 85 ? "profit" : score.total >= 60 ? "warn" : "loss"
                }
              >
                {score.total}/100
              </Badge>
            </CardHeader>
            <CardBody>
              {score.breakdown.length === 0 ? (
                <p className="text-2xs text-ink-500">
                  Record trades to see your discipline score.
                </p>
              ) : (
                <ul className="space-y-3">
                  {score.breakdown.map((b) => {
                    const pct = (b.score / b.max) * 100;
                    const barClass =
                      pct >= 85 ? "bg-profit" : pct >= 60 ? "bg-warn" : "bg-loss";
                    return (
                      <li key={b.key}>
                        <div className="flex items-center justify-between text-2xs">
                          <span className="text-ink-800">{b.label}</span>
                          <span className="tabular text-ink-600">
                            {b.score.toFixed(1)} / {b.max}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                          <div
                            className={`h-full ${barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-0.5 text-3xs text-ink-500">{b.hint}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-loss-text" />
                <CardTitle>Rule Violations</CardTitle>
              </div>
              <Badge tone={violations.length > 0 ? "loss" : "profit"}>
                {violations.length}
              </Badge>
            </CardHeader>
            <CardBody>
              {violations.length === 0 ? (
                <p className="text-2xs text-ink-500">
                  No rule violations detected. Keep it clean.
                </p>
              ) : (
                <ul className="space-y-2">
                  {violations.map((v, i) => (
                    <li
                      key={i}
                      className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text"
                    >
                      <span className="font-medium uppercase tracking-wide">
                        {v.code.replace(/_/g, " ")}
                      </span>
                      <span className="ml-2 opacity-90">{v.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
                <Badge tone="warn">{warnings.length}</Badge>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  {warnings.map((w, i) => (
                    <li
                      key={i}
                      className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text"
                    >
                      <span className="font-medium uppercase tracking-wide">
                        {w.code.replace(/_/g, " ")}
                      </span>
                      <span className="ml-2 opacity-90">{w.message}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-brand-600" />
                <CardTitle>Your Personal Rules</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2 text-2xs">
                <li className="flex items-center justify-between border-b border-border py-1.5">
                  <span className="text-ink-700">One trade per day</span>
                  <span className="text-ink-500">Enforced</span>
                </li>
                <li className="flex items-center justify-between border-b border-border py-1.5">
                  <span className="text-ink-700">EURUSD only</span>
                  <span className="text-ink-500">
                    {currentAccount &&
                    (currentAccount as unknown as { allowed_instrument?: string })
                      .allowed_instrument
                      ? (currentAccount as unknown as { allowed_instrument?: string })
                          .allowed_instrument
                      : "EURUSD"}
                  </span>
                </li>
                <li className="flex items-center justify-between border-b border-border py-1.5">
                  <span className="text-ink-700">Risk ≤ 0.25% per trade</span>
                  <span className="text-ink-500">Enforced</span>
                </li>
                <li className="flex items-center justify-between border-b border-border py-1.5">
                  <span className="text-ink-700">SL 10–15 pips</span>
                  <span className="text-ink-500">Enforced</span>
                </li>
                <li className="flex items-center justify-between border-b border-border py-1.5">
                  <span className="text-ink-700">RR ≥ 1:2</span>
                  <span className="text-ink-500">Enforced</span>
                </li>
                <li className="flex items-center justify-between py-1.5">
                  <span className="text-ink-700">No trading during high-impact news</span>
                  <span className="text-ink-500">Enforced</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
