"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InstrumentStats } from "@/lib/calc";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

export function InstrumentBreakdown({ stats }: { stats: InstrumentStats[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          <CardTitle>Performance by Instrument</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {stats.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No instrument data" description="Record trades to see your breakdown." compact />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Instrument</th>
                  <th className="px-4 py-2 text-right font-medium">Trades</th>
                  <th className="px-4 py-2 text-right font-medium">Win Rate</th>
                  <th className="px-4 py-2 text-right font-medium">Net P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.map((s) => (
                  <tr key={s.instrument} className="hover:bg-surface-soft">
                    <td className="px-4 py-2.5 text-xs font-medium text-ink-900">{s.instrument}</td>
                    <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                      {s.trades}
                      <span className="ml-1 text-3xs text-ink-400">({s.wins}W · {s.losses}L)</span>
                    </td>
                    <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                      {s.winRate !== null ? formatPercent(s.winRate, 1) : "—"}
                    </td>
                    <td className={cn("tabular px-4 py-2.5 text-right text-xs font-semibold", s.pnl >= 0 ? "text-profit-text" : "text-loss-text")}>
                      {formatCurrency(s.pnl, { showSign: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
