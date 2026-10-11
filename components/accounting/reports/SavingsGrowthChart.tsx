"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrendingUp } from "lucide-react";
import type { SavingsPoint } from "@/lib/accounting/reports";

export function SavingsGrowthChart({ data }: { data: SavingsPoint[] }) {
  const hasData = data.some(
    (p) => p.savings > 0 || p.accountFund > 0 || p.business > 0 || p.cash > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Growth Over Time</CardTitle>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <EmptyState
            icon={<TrendingUp className="h-4 w-4" />}
            title="No fund history yet"
            description="Once you allocate payouts, growth appears here."
            compact
          />
        ) : (
          <div className="h-56 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12 }}
                  formatter={((value: unknown) =>
                    `$${Number(value).toFixed(2)}`) as never}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="savings"
                  name="Personal Savings"
                  stroke="#16a34a"
                  fill="#16a34a"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="accountFund"
                  name="Account Fund"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="business"
                  name="Business Operating"
                  stroke="#d97706"
                  fill="#d97706"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  name="Business Cash"
                  stroke="#64748b"
                  fill="#64748b"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

