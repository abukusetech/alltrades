"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";
import type { MonthlyBucket } from "@/lib/accounting/reports";

export function MonthlyCashFlowChart({ data }: { data: MonthlyBucket[] }) {
  const hasData = data.some((b) => b.income > 0 || b.expenses > 0 || b.savings > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Cash Flow</CardTitle>
        <Badge tone="neutral">{data.length} months</Badge>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <EmptyState
            icon={<BarChart3 className="h-4 w-4" />}
            title="No cash flow data"
            description="Record income, expenses or savings to see your monthly trend."
            compact
          />
        ) : (
          <div className="h-56 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12 }}
                  formatter={((value: unknown) =>
                    `$${Number(value).toFixed(2)}`) as never}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name="Income" fill="#16a34a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[3, 3, 0, 0]} />
                <Bar dataKey="savings" name="Savings" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

