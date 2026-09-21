import { Card, CardBody } from "@/components/ui/Card";
import type { AccountMetrics } from "@/lib/calc";

export interface ConsistencyStatsProps {
  metrics: AccountMetrics;
  averageTradesPerWeek: number;
}

export function ConsistencyStats({
  metrics,
  averageTradesPerWeek,
}: ConsistencyStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Consistency Score"
        value={`${metrics.consistencyScore.toFixed(1)}%`}
      />
      <Stat
        label="Average Trades / Week"
        value={averageTradesPerWeek.toFixed(1)}
      />
      <Stat
        label="Maximum Weekly Trades"
        value={String(metrics.maxWeeklyTrades)}
      />
      <Stat
        label="Trading Days"
        value={String(metrics.tradingDays)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="eyebrow">{label}</div>
        <div className="tabular mt-1 text-lg font-semibold text-ink-900">
          {value}
        </div>
      </CardBody>
    </Card>
  );
}
