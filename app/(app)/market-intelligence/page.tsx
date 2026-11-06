"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { Activity, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";

const VolatilityCard = dynamic(
  () => import("@/components/market-intelligence/VolatilityCard").then((m) => m.VolatilityCard),
  { ssr: false }
);

const SentimentSection = dynamic(
  () => import("@/components/market-intelligence/SentimentSection").then((m) => m.SentimentSection),
  { ssr: false }
);

const SessionsPanel = dynamic(
  () => import("@/components/dashboard/SessionsPanel").then((m) => m.SessionsPanel),
  { ssr: false }
);

export default function MarketIntelligencePage() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Intelligence"
        subtitle="Live volatility, sessions, and market conditions for EURUSD and XAUUSD."
      />

      {currentAccount && (
        <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
      )}

      {/* Market Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-600" />
            <CardTitle>Market Overview</CardTitle>
          </div>
          <Badge tone="neutral">Live</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-2xs leading-relaxed text-ink-600">
            Volatility classifications use ATR (Average True Range, 14-period) compared
            against the historical average ATR for the same instrument and timeframe.
            A classification of NORMAL means volatility is within its typical range —
            it does not mean the market is safe. This is an informational tool, not a
            trading signal. Trade Check and your weekly loss limit remain the
            authoritative decision systems.
          </p>
        </CardBody>
      </Card>

      {/* Market Sentiment */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-900">Market Sentiment</h2>
          <Badge tone="warn" className="ml-2">Reference Only · Not for Execution</Badge>
        </div>
        <SentimentSection />
      </div>

      {/* Volatility Grid */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Activity className="h-4 w-4 text-brand-600" />
          Live Volatility
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <VolatilityCard symbol="EURUSD" />
          <VolatilityCard symbol="XAUUSD" />
        </div>
      </div>

      {/* Sessions */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Clock className="h-4 w-4 text-brand-600" />
          Live Sessions & ICT Kill Zones
        </h2>
        <SessionsPanel />
      </div>
    </div>
  );
}

