"use client";

import { X, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatCurrency, formatDateLong, parseDateKey } from "@/lib/utils";
import type { DailyPnL } from "@/lib/calc";
import type { Trade } from "@/lib/types";

export interface DayDetailPanelProps {
  dateKey: string | null;
  day: DailyPnL | null;
  trades: Trade[];
  onClose: () => void;
}

export function DayDetailPanel({
  dateKey,
  day,
  trades,
  onClose,
}: DayDetailPanelProps) {
  if (!dateKey) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-soft p-6 text-center">
        <p className="text-xs text-ink-500">
          Select a day to view that day&apos;s trades and P/L.
        </p>
      </div>
    );
  }

  const date = parseDateKey(dateKey);
  const pnl = day?.pnl ?? 0;
  const tradesCount = day?.trades ?? 0;

  const pnlClass =
    pnl > 0
      ? "text-profit-text"
      : pnl < 0
        ? "text-loss-text"
        : "text-ink-700";

  const tone = pnl > 0 ? "profit" : pnl < 0 ? "loss" : "neutral";

  return (
    <div className="rounded-lg border border-border bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="text-3xs uppercase tracking-wide text-ink-500">
            Day detail
          </div>
          <div className="truncate text-sm font-semibold text-ink-900">
            {formatDateLong(date)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day detail"
          className="flex h-7 w-7 items-center justify-center rounded text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xs uppercase tracking-wide text-ink-500">
              Realized P/L
            </div>
            <div className={cn("tabular mt-0.5 text-lg font-semibold", pnlClass)}>
              {formatCurrency(pnl, { showSign: true })}
            </div>
          </div>
          <Badge tone={tone}>
            {pnl > 0 ? "Winning day" : pnl < 0 ? "Losing day" : "Breakeven"}
          </Badge>
        </div>
        <div className="mt-2 text-2xs text-ink-500">
          {tradesCount} {tradesCount === 1 ? "trade" : "trades"}
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<BookOpen className="h-4 w-4" />}
            title="No trades on this day"
            description="Nothing was recorded for this date."
            compact
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {trades.map((t) => {
            const pl = Number(t.profit_loss) || 0;
            const plClass =
              pl > 0
                ? "text-profit-text"
                : pl < 0
                  ? "text-loss-text"
                  : "text-ink-700";
            const tTone =
              t.result === "Win"
                ? "profit"
                : t.result === "Loss"
                  ? "loss"
                  : "neutral";
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-ink-900">
                      {t.instrument}
                    </span>
                    <Badge tone={tTone}>{t.result}</Badge>
                  </div>
                  <div className="mt-0.5 text-3xs text-ink-500">
                    {t.trade_time ? `${t.trade_time.slice(0, 5)} · ` : ""}
                    {t.direction}
                    {t.strategy ? ` · ${t.strategy}` : ""}
                  </div>
                </div>
                <div className={cn("tabular text-xs font-semibold", plClass)}>
                  {formatCurrency(pl, { showSign: true })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
