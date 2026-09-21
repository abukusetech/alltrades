"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { AccountMetrics } from "@/lib/calc";
import { cn, formatPercent } from "@/lib/utils";

export interface ResultsDonutProps {
  metrics: AccountMetrics;
}

const COLORS = {
  win: "#16a34a",
  loss: "#dc2626",
  breakeven: "#94a3b8",
} as const;

export function ResultsDonut({ metrics }: ResultsDonutProps) {
  const data = [
    { name: "Wins", key: "win", value: metrics.winningTrades },
    { name: "Losses", key: "loss", value: metrics.losingTrades },
    { name: "Breakeven", key: "breakeven", value: metrics.breakevenTrades },
  ];

  const total = metrics.totalTrades;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        <span className="text-3xs text-ink-500">
          {total} {total === 1 ? "trade" : "trades"}
        </span>
      </CardHeader>
      <CardBody>
        {total === 0 ? (
          <div className="flex h-64 items-center justify-center text-2xs text-ink-500">
            No trade results yet.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {data
                      .filter((d) => d.value > 0)
                      .map((d) => (
                        <Cell
                          key={d.key}
                          fill={COLORS[d.key as keyof typeof COLORS]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                    formatter={(v: number, n: string) => [`${v}`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full space-y-2">
              {data.map((d) => {
                const pct =
                  total > 0 ? (d.value / total) * 100 : 0;
                const color =
                  d.key === "win"
                    ? "bg-profit"
                    : d.key === "loss"
                      ? "bg-loss"
                      : "bg-ink-400";
                return (
                  <div
                    key={d.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-sm", color)} />
                      <span className="text-xs text-ink-700">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular text-xs font-semibold text-ink-900">
                        {d.value}
                      </span>
                      <span className="tabular w-14 text-right text-3xs text-ink-500">
                        {formatPercent(pct, 1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
