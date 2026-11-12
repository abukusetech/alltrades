"use client";

import * as React from "react";
import { Building2, User, Layers } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/Card";
import type { GroupedMetrics, SimpleMetrics } from "@/lib/accounts/metrics";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { AccountFilterMode } from "@/components/layout/AppShell";

export function TypeAwareMetrics({
  mode,
  grouped,
}: {
  mode: AccountFilterMode;
  grouped: GroupedMetrics;
}) {
  if (mode === "MAVEN") {
    return (
      <TypeBlock
        type="MAVEN"
        metrics={grouped.maven}
        title="Maven Prop Firm"
      />
    );
  }
  if (mode === "PERSONAL") {
    return (
      <TypeBlock
        type="PERSONAL"
        metrics={grouped.personal}
        title="Personal Capital"
      />
    );
  }
  if (mode === "SINGLE") {
    // In single mode we don't know the account type from this component, so
    // we merge — the current account is what the user is looking at.
    const m = grouped.maven.accountCount > 0 ? grouped.maven : grouped.personal;
    return (
      <TypeBlock
        type={grouped.maven.accountCount > 0 ? "MAVEN" : "PERSONAL"}
        metrics={m}
        title="Current Account"
      />
    );
  }

  // ALL mode — show Maven and Personal in their own blocks, never summed.
  return (
    <div className="space-y-5">
      <TypeBlock
        type="MAVEN"
        metrics={grouped.maven}
        title="Maven Prop Firm Accounts"
      />
      <TypeBlock
        type="PERSONAL"
        metrics={grouped.personal}
        title="Personal Capital Accounts"
      />
      {grouped.unclassified.accountCount > 0 && (
        <TypeBlock
          type="UNCLASSIFIED"
          metrics={grouped.unclassified}
          title="Unclassified Accounts"
        />
      )}
    </div>
  );
}

function TypeBlock({
  type,
  metrics,
  title,
}: {
  type: "MAVEN" | "PERSONAL" | "UNCLASSIFIED";
  metrics: SimpleMetrics;
  title: string;
}) {
  const Icon =
    type === "MAVEN" ? Building2 : type === "PERSONAL" ? User : Layers;
  const tone =
    type === "MAVEN" ? "brand" : type === "PERSONAL" ? "profit" : "warn";

  const pnlClass =
    metrics.totalPnL > 0
      ? "text-profit-text"
      : metrics.totalPnL < 0
        ? "text-loss-text"
        : "text-ink-900";

  if (metrics.accountCount === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-ink-500" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge tone="neutral">No accounts</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-2xs text-ink-500">
            No {type === "MAVEN" ? "Maven" : type === "PERSONAL" ? "personal" : "unclassified"}{" "}
            accounts are in view. Create one in Settings.
          </p>
        </CardBody>
      </Card>
    );
  }

  // Labels differ by type
  const capitalLabel =
    type === "MAVEN"
      ? "Maven Equity"
      : type === "PERSONAL"
        ? "Personal Capital"
        : "Current Capital";

  const capitalHint =
    type === "MAVEN"
      ? "Sum of starting capital + P/L − withdrawals across Maven accounts"
      : type === "PERSONAL"
        ? "Sum across personal accounts"
        : undefined;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon
          className={cn(
            "h-4 w-4",
            type === "MAVEN"
              ? "text-brand-600"
              : type === "PERSONAL"
                ? "text-profit-text"
                : "text-warn-text"
          )}
        />
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        <Badge tone={tone}>
          {metrics.accountCount} account{metrics.accountCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={capitalLabel}
          value={formatCurrency(metrics.currentCapital)}
          hint={capitalHint}
        />
        <MetricCard
          label="Total P/L"
          value={formatCurrency(metrics.totalPnL, { showSign: true })}
          valueClassName={pnlClass}
          hint={`${metrics.totalTrades} ${metrics.totalTrades === 1 ? "trade" : "trades"}`}
        />
        {type === "MAVEN" ? (
          <MetricCard
            label="Consistency Score"
            value={
              metrics.consistencyScore !== null
                ? formatPercent(metrics.consistencyScore, 1)
                : "N/A"
            }
            valueClassName={
              metrics.consistencyScore !== null && metrics.consistencyScore > 20
                ? "text-loss-text"
                : undefined
            }
            hint="Biggest winning day ÷ total profit"
          />
        ) : (
          <MetricCard
            label="Win Rate"
            value={
              metrics.winRate !== null ? formatPercent(metrics.winRate, 1) : "—"
            }
            hint={
              metrics.totalTrades > 0
                ? `${metrics.winningTrades} of ${metrics.totalTrades} trades`
                : "No trades yet"
            }
          />
        )}
        <MetricCard
          label="Withdrawn"
          value={formatCurrency(metrics.totalWithdrawn)}
          hint={
            type === "MAVEN" ? "Payouts received" : "Withdrawn from broker"
          }
        />
      </div>
    </div>
  );
}


