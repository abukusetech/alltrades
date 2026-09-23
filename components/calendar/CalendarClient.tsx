"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics, type DailyPnL } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Button } from "@/components/ui/Button";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { DayDetailPanel } from "./DayDetailPanel";
import {
  cn,
  endOfMonth,
  formatCurrency,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface GridCell {
  key: string;
  date: Date;
  inMonth: boolean;
  day: DailyPnL | null;
}

export function CalendarClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);

  const [cursor, setCursor] = React.useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const selectedDayTrades = React.useMemo(
    () =>
      selectedDate ? trades.filter((t) => t.trade_date === selectedDate) : [],
    [trades, selectedDate]
  );
  const selectedDay: DailyPnL | null = React.useMemo(
    () =>
      selectedDate ? metrics.dailyMap.get(selectedDate) ?? null : null,
    [metrics, selectedDate]
  );

  // ---- Build a Sunday-first 6×7 grid (42 cells) ----
  const grid: GridCell[] = React.useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    // Sunday on or before the 1st
    const gridStart = startOfWeek(first);
    const cells: GridCell[] = [];
    // Always 42 cells so the layout is stable across months
    for (let i = 0; i < 42; i++) {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + i
      );
      const key = toDateKey(d);
      cells.push({
        key,
        date: d,
        inMonth: d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear(),
        day: metrics.dailyMap.get(key) ?? null,
      });
    }
    void last;
    return cells;
  }, [cursor, metrics]);

  // ---- Group into 6 weeks with weekly totals ----
  const weeks = React.useMemo(() => {
    const rows: {
      cells: GridCell[];
      weekPnl: number;
      weekTrades: number;
    }[] = [];
    for (let i = 0; i < grid.length; i += 7) {
      const cells = grid.slice(i, i + 7);
      const weekPnl = cells.reduce((s, c) => s + (c.day?.pnl ?? 0), 0);
      const weekTrades = cells.reduce((s, c) => s + (c.day?.trades ?? 0), 0);
      rows.push({ cells, weekPnl, weekTrades });
    }
    return rows;
  }, [grid]);

  // ---- Monthly summary ----
  const monthSummary = React.useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    let pnl = 0;
    let tradeCount = 0;
    for (const [k, v] of metrics.dailyMap) {
      const d = parseDateKey(k);
      if (d >= first && d <= last) {
        pnl += v.pnl;
        tradeCount += v.trades;
      }
    }
    return { pnl, trades: tradeCount };
  }, [metrics, cursor]);

  const todayKey = toDateKey(new Date());

  function prevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() {
    const now = new Date();
    setCursor(startOfMonth(now));
    setSelectedDate(toDateKey(now));
  }

  const monthLabel = cursor.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const monthPnlClass =
    monthSummary.pnl > 0
      ? "text-profit-text"
      : monthSummary.pnl < 0
        ? "text-loss-text"
        : "text-ink-700";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Daily realized P/L, trade counts and weekly totals."
      />

      {!currentAccount ? (
        <EmptyState
          title="No account selected"
          description="Create an account in Settings to view the calendar."
        />
      ) : isLoading && trades.length === 0 ? (
        <BlockLoader label="Loading calendar" />
      ) : (
        <>
          <AccountHeader
            account={currentAccount}
            currentCapital={metrics.currentCapital}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* Month header */}
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={prevMonth}
                    aria-label="Previous month"
                    className="flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-[140px] text-center">
                    <div className="text-sm font-semibold text-ink-900">
                      {monthLabel}
                    </div>
                    <div className="mt-0.5 text-3xs text-ink-500">
                      Monthly P/L{" "}
                      <span className={cn("tabular font-medium", monthPnlClass)}>
                        {formatCurrency(monthSummary.pnl, { showSign: true })}
                      </span>
                      {" · "}
                      <span className="tabular">
                        {monthSummary.trades}{" "}
                        {monthSummary.trades === 1 ? "trade" : "trades"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={goToday}>
                  Today
                </Button>
              </div>

              {/* Calendar grid */}
              <div className="overflow-hidden rounded-lg border border-border bg-white shadow-card">
                {/* Weekday header */}
                <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_110px] border-b border-border bg-surface-muted">
                  {WEEKDAY_LABELS.map((d) => (
                    <div
                      key={d}
                      className="px-2 py-2 text-center text-3xs font-medium uppercase tracking-wide text-ink-500"
                    >
                      {d}
                    </div>
                  ))}
                  <div className="border-l border-border px-2 py-2 text-center text-3xs font-medium uppercase tracking-wide text-ink-500">
                    Weekly Total
                  </div>
                </div>

                {weeks.map((w, wi) => (
                  <div
                    key={wi}
                    className="grid grid-cols-[repeat(7,minmax(0,1fr))_110px] border-b border-border last:border-b-0"
                  >
                    {w.cells.map((c) => {
                      const isToday = c.key === todayKey;
                      const isSelected = c.key === selectedDate;
                      const dayPnl = c.day?.pnl ?? 0;
                      const hasTrades = (c.day?.trades ?? 0) > 0;

                      const cellBg = !c.inMonth
                        ? "bg-surface-soft/40"
                        : hasTrades
                          ? dayPnl > 0
                            ? "bg-profit-bg hover:bg-profit-bg/70"
                            : dayPnl < 0
                              ? "bg-loss-bg hover:bg-loss-bg/70"
                              : "bg-surface-muted hover:bg-surface-muted/70"
                          : "bg-white hover:bg-surface-muted/40";

                      const pnlText = hasTrades
                        ? dayPnl > 0
                          ? "text-profit-text"
                          : dayPnl < 0
                            ? "text-loss-text"
                            : "text-ink-700"
                        : "text-transparent";

                      return (
                        <button
                          type="button"
                          key={c.key}
                          onClick={() => setSelectedDate(c.key)}
                          className={cn(
                            "flex h-[88px] flex-col items-start justify-between border-r border-border p-2 text-left transition-colors",
                            cellBg,
                            !c.inMonth && "opacity-50",
                            isSelected && "ring-2 ring-inset ring-brand-600"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span
                              className={cn(
                                "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-2xs",
                                isToday
                                  ? "bg-brand-600 font-semibold text-white"
                                  : "text-ink-700"
                              )}
                            >
                              {c.date.getDate()}
                            </span>
                            {hasTrades && (
                              <span className="text-3xs text-ink-500">
                                {c.day?.trades}t
                              </span>
                            )}
                          </div>
                          {hasTrades ? (
                            <div
                              className={cn(
                                "tabular text-xs font-semibold",
                                pnlText
                              )}
                            >
                              {formatCurrency(dayPnl, { showSign: true })}
                            </div>
                          ) : (
                            <span className="text-3xs text-ink-300">—</span>
                          )}
                        </button>
                      );
                    })}

                    {/* Weekly total */}
                    <div
                      className={cn(
                        "flex h-[88px] flex-col justify-center border-l border-border bg-surface-soft px-2",
                        w.weekPnl > 0
                          ? "text-profit-text"
                          : w.weekPnl < 0
                            ? "text-loss-text"
                            : "text-ink-500"
                      )}
                    >
                      <div className="tabular text-xs font-semibold">
                        {formatCurrency(w.weekPnl, { showSign: true })}
                      </div>
                      <div className="mt-0.5 text-3xs text-ink-500">
                        {w.weekTrades}{" "}
                        {w.weekTrades === 1 ? "trade" : "trades"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-3xs text-ink-500">
                <LegendDot className="bg-profit-bg border-profit-border" label="Winning day" />
                <LegendDot className="bg-loss-bg border-loss-border" label="Losing day" />
                <LegendDot className="bg-surface-muted border-border-strong" label="Breakeven" />
                <LegendDot className="bg-white border-border" label="No trading" />
              </div>
            </div>

            {/* Day detail */}
            <div>
              <DayDetailPanel
                dateKey={selectedDate}
                day={selectedDay}
                trades={selectedDayTrades}
                onClose={() => setSelectedDate(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm border", className)} />
      {label}
    </span>
  );
}
