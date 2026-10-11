"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PieChart as PieIcon } from "lucide-react";
import type { CategoryBreakdown } from "@/lib/accounting/reports";
import { cn, formatCurrency } from "@/lib/utils";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#64748b"];

export function CategoryBreakdownChart({
  title,
  data,
  emptyMessage = "No data yet.",
}: {
  title: string;
  data: CategoryBreakdown[];
  emptyMessage?: string;
}) {
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {total > 0 && (
          <span className="tabular text-2xs text-ink-500">
            Total: {formatCurrency(total)}
          </span>
        )}
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <EmptyState
            icon={<PieIcon className="h-4 w-4" />}
            title={emptyMessage}
            description="Recorded transactions will appear here."
            compact
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-52 w-52 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12 }}
                    formatter={((value: unknown, name: unknown) =>
                      [`$${Number(value).toFixed(2)}`, String(name)]) as never}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2">
              {data.map((d, i) => (
                <li key={d.key} className="flex items-center justify-between gap-2 text-2xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-ink-700">{d.label}</span>
                    <span className="text-3xs text-ink-500">({d.count})</span>
                  </div>
                  <span className={cn("tabular font-semibold text-ink-900")}>
                    {formatCurrency(d.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
