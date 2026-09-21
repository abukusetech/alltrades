"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { BreakdownRow } from "@/lib/calc";
import { Layers } from "lucide-react";

export interface BreakdownTableProps {
  title: string;
  rows: BreakdownRow[];
  emptyLabel?: string;
}

export function BreakdownTable({
  title,
  rows,
  emptyLabel = "No data yet.",
}: BreakdownTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <span className="text-3xs text-ink-500">
          {rows.length} {rows.length === 1 ? "group" : "groups"}
        </span>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Layers className="h-4 w-4" />}
              title={emptyLabel}
              description="Data will appear here once trades are recorded."
              compact
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Group</th>
                  <th className="px-4 py-2 text-right font-medium">Trades</th>
                  <th className="px-4 py-2 text-right font-medium">Win rate</th>
                  <th className="px-4 py-2 text-right font-medium">P/L</th>
                  <th className="px-4 py-2 text-right font-medium">Avg P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const plClass =
                    r.pnl > 0
                      ? "text-profit-text"
                      : r.pnl < 0
                        ? "text-loss-text"
                        : "text-ink-700";
                  const avgClass =
                    r.averagePnL != null && r.averagePnL > 0
                      ? "text-profit-text"
                      : r.averagePnL != null && r.averagePnL < 0
                        ? "text-loss-text"
                        : "text-ink-700";
                  return (
                    <tr key={r.key} className="hover:bg-surface-soft">
                      <td className="px-4 py-2.5 text-xs font-medium text-ink-900">
                        {r.key}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                        {r.trades}
                        <span className="ml-1 text-3xs text-ink-400">
                          ({r.wins}W · {r.losses}L · {r.breakeven}BE)
                        </span>
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                        {r.winRate != null ? formatPercent(r.winRate, 1) : "—"}
                      </td>
                      <td
                        className={cn(
                          "tabular px-4 py-2.5 text-right text-xs font-semibold",
                          plClass
                        )}
                      >
                        {formatCurrency(r.pnl, { showSign: true })}
                      </td>
                      <td
                        className={cn(
                          "tabular px-4 py-2.5 text-right text-xs",
                          avgClass
                        )}
                      >
                        {r.averagePnL != null
                          ? formatCurrency(r.averagePnL, { showSign: true })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
