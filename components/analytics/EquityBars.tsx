"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartNoAxesCombined } from "lucide-react";
import type { Trade, Account } from "@/lib/types";
import { cn, formatCurrency, toDateKey, startOfWeek } from "@/lib/utils";

type Range = "day" | "week" | "month" | "year" | "all";

export interface EquityBarsProps {
  account: Account;
  trades: Trade[];
}

interface Bucket {
  key: string;
  label: string;
  balance: number;
  delta: number;
}

function buildBuckets(
  account: Account,
  trades: Trade[],
  range: Range
): Bucket[] {
  const startCap = Number(account.starting_capital) || 0;

  if (trades.length === 0) return [];

  const sorted = [...trades].sort((a, b) =>
    a.trade_date.localeCompare(b.trade_date)
  );

  const buckets = new Map<string, { pnl: number; label: string; order: number }>();

  for (const t of sorted) {
    const d = new Date(t.trade_date + "T00:00:00");
    let key: string;
    let label: string;
    let order: number;

    switch (range) {
      case "day": {
        key = toDateKey(d);
        label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        order = d.getTime();
        break;
      }
      case "week": {
        const s = startOfWeek(d);
        key = toDateKey(s);
        label = s.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        order = s.getTime();
        break;
      }
      case "month": {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        order = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        break;
      }
      case "year": {
        key = String(d.getFullYear());
        label = key;
        order = new Date(d.getFullYear(), 0, 1).getTime();
        break;
      }
      case "all":
      default: {
        key = "all";
        label = "All Time";
        order = 0;
      }
    }

    const existing = buckets.get(key) ?? { pnl: 0, label, order };
    existing.pnl += Number(t.profit_loss) || 0;
    buckets.set(key, existing);
  }

  const ordered = Array.from(buckets.entries())
    .sort(([, a], [, b]) => a.order - b.order);

  let running = startCap;
  let prevBalance = startCap;
  const out: Bucket[] = [];
  for (const [key, v] of ordered) {
    running += v.pnl;
    out.push({
      key,
      label: v.label,
      balance: running,
      delta: running - prevBalance,
    });
    prevBalance = running;
  }
  return out;
}

export function EquityBars({ account, trades }: EquityBarsProps) {
  const [range, setRange] = React.useState<Range>("day");

  const buckets = React.useMemo(
    () => buildBuckets(account, trades, range),
    [account, trades, range]
  );

  const min = React.useMemo(
    () => Math.min(Number(account.starting_capital), ...buckets.map((b) => b.balance)),
    [account, buckets]
  );
  const max = React.useMemo(
    () => Math.max(Number(account.starting_capital), ...buckets.map((b) => b.balance)),
    [account, buckets]
  );

  const spread = Math.max(max - min, 1);
  const startCap = Number(account.starting_capital) || 0;

  const RANGE_LABELS: { key: Range; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "all", label: "All Time" },
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Account Performance</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            Balance progression computed from your recorded trades.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {RANGE_LABELS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded px-2 py-1 text-3xs font-medium transition-colors",
                range === r.key
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-surface-muted hover:text-ink-800"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardBody>
        {buckets.length === 0 ? (
          <EmptyState
            icon={<ChartNoAxesCombined className="h-4 w-4" />}
            title="No performance data yet"
            description="Record trades to see account progression here."
            compact
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">
                Starting {formatCurrency(startCap)}
              </Badge>
              <Badge tone={buckets[buckets.length - 1].balance >= startCap ? "profit" : "loss"}>
                Current {formatCurrency(buckets[buckets.length - 1].balance)}
              </Badge>
              <Badge tone="neutral">{buckets.length} period{buckets.length > 1 ? "s" : ""}</Badge>
            </div>

            {/* Bar chart — balance per period */}
            <div className="relative h-64 w-full">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border-t border-border/60"
                  >
                    <span className="w-14 shrink-0 -translate-y-2 text-3xs text-ink-400">
                      {formatCurrency(min + (spread * i) / 4)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Starting capital reference line */}
              <div
                className="pointer-events-none absolute left-16 right-0 border-t border-dashed border-ink-400/60"
                style={{
                  bottom: `${((startCap - min) / spread) * 100}%`,
                }}
              >
                <span className="absolute -top-4 right-1 text-3xs text-ink-500">
                  Starting capital
                </span>
              </div>

              {/* Bars */}
              <div className="absolute left-16 right-0 bottom-0 top-0 flex items-end gap-1 overflow-x-auto">
                {buckets.map((b) => {
                  const heightPct = ((b.balance - min) / spread) * 100;
                  const isProfit = b.delta >= 0;
                  return (
                    <div
                      key={b.key}
                      className="group relative flex h-full min-w-[20px] flex-1 flex-col items-center justify-end"
                      title={`${b.label} · ${formatCurrency(b.balance)}`}
                    >
                      <div
                        className={cn(
                          "w-full rounded-t transition-opacity",
                          isProfit ? "bg-profit/80 group-hover:bg-profit" : "bg-loss/80 group-hover:bg-loss"
                        )}
                        style={{ height: `${Math.max(heightPct, 0.5)}%` }}
                      />
                      <div className="mt-1 max-w-[60px] truncate text-3xs text-ink-500">
                        {b.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
