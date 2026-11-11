"use client";

import * as React from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useVolatility } from "@/lib/hooks/useVolatility";
import { cn } from "@/lib/utils";

const CLASS_TONE = {
  LOW: "neutral" as const,
  NORMAL: "profit" as const,
  HIGH: "warn" as const,
  EXTREME: "loss" as const,
  UNAVAILABLE: "neutral" as const,
};

const CLASS_LABEL = {
  LOW: "LOW VOLATILITY",
  NORMAL: "NORMAL VOLATILITY",
  HIGH: "HIGH VOLATILITY",
  EXTREME: "EXTREME VOLATILITY",
  UNAVAILABLE: "DATA UNAVAILABLE",
};

const TIMEFRAMES = [
  { value: "5min", label: "5M" },
  { value: "15min", label: "15M" },
  { value: "30min", label: "30M" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
];

export function VolatilityCard({ symbol }: { symbol: "EURUSD" | "XAUUSD" }) {
  const [timeframe, setTimeframe] = React.useState("15min");
  const data = useVolatility(symbol, timeframe);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-600" />
          <CardTitle>{symbol}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            options={TIMEFRAMES}
            className="h-7 w-20 text-2xs"
          />
          <Badge tone={CLASS_TONE[data.result.classification]}>
            {CLASS_LABEL[data.result.classification]}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {data.providerStatus === "loading" && (
          <div className="text-2xs text-ink-500">Loading market data…</div>
        )}

        {data.providerStatus === "closed" && (
          <div className="rounded border border-border bg-surface-soft px-3 py-6 text-center">
            <div className="text-2xs font-semibold text-ink-900">Market Closed</div>
            <div className="mt-1 text-3xs text-ink-500">Volatility will resume on Monday.</div>
          </div>
        )}

        {data.providerStatus === "error" && (
          <div className="flex items-start gap-2 rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-medium">MARKET DATA UNAVAILABLE</div>
              <div className="mt-0.5 text-3xs opacity-80">
                {data.errorMessage ?? "TwelveData is not responding"}
              </div>
            </div>
          </div>
        )}

        {data.providerStatus === "ready" && (
          <>
            {data.warning && (
              <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-3xs text-warn-text">
                {data.warning}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="ATR (14)"
                value={
                  data.result.atr !== null
                    ? data.result.atr.toFixed(symbol === "XAUUSD" ? 2 : 5)
                    : "—"
                }
              />
              <Stat
                label="ATR % of price"
                value={
                  data.result.atrPercent !== null
                    ? `${data.result.atrPercent.toFixed(2)}%`
                    : "—"
                }
              />
              <Stat
                label="vs Historical"
                value={
                  data.result.relativeToAverage !== null
                    ? `${(data.result.relativeToAverage * 100).toFixed(0)}%`
                    : "—"
                }
                tone={
                  data.result.relativeToAverage === null
                    ? undefined
                    : data.result.relativeToAverage > 1.5
                      ? "loss"
                      : data.result.relativeToAverage > 1.2
                        ? "warn"
                        : "profit"
                }
              />
            </div>

            {data.result.reason && (
              <p className="text-2xs leading-relaxed text-ink-600">{data.result.reason}</p>
            )}

            <div className="border-t border-border pt-2 text-3xs text-ink-500">
              <div className="flex items-center justify-between">
                <span>Timeframe: {TIMEFRAMES.find((t) => t.value === timeframe)?.label}</span>
                <span>
                  Updated{" "}
                  {data.lastUpdated
                    ? new Date(data.lastUpdated).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "warn" | "loss";
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div
        className={cn(
          "tabular mt-0.5 text-sm font-semibold",
          tone === "profit"
            ? "text-profit-text"
            : tone === "warn"
              ? "text-warn-text"
              : tone === "loss"
                ? "text-loss-text"
                : "text-ink-900"
        )}
      >
        {value}
      </div>
    </div>
  );
}

