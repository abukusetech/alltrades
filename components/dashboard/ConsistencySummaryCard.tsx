import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface ConsistencySummaryCardProps {
  metrics: AccountMetrics;
}

export function ConsistencySummaryCard({ metrics }: ConsistencySummaryCardProps) {
  const {
    consistencyScore,
    maxConsistencyPercent,
    consistencyStatus,
    biggestWinningDay,
    requiredTotalProfit,
    totalProfit,
  } = metrics;

  const Icon =
    consistencyStatus === "over"
      ? ShieldX
      : consistencyStatus === "approaching"
        ? ShieldAlert
        : ShieldCheck;

  const iconClass =
    consistencyStatus === "over"
      ? "text-loss-text"
      : consistencyStatus === "approaching"
        ? "text-warn-text"
        : "text-profit-text";

  const tone =
    consistencyStatus === "over"
      ? "loss"
      : consistencyStatus === "approaching"
        ? "warn"
        : "profit";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistency Score</CardTitle>
        <Badge tone={tone}>
          {consistencyStatus === "over"
            ? "Above limit"
            : consistencyStatus === "approaching"
              ? "Approaching"
              : "Within limit"}
        </Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} />
          <div>
            <div className="tabular text-2xl font-semibold tracking-tight text-ink-900">
              {formatPercent(consistencyScore, 1)}
            </div>
            <p className="mt-0.5 text-2xs text-ink-500">
              Maximum allowed: {formatPercent(maxConsistencyPercent, 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Metric
            label="Biggest winning day"
            value={formatCurrency(biggestWinningDay)}
          />
          <Metric
            label="Total profit"
            value={formatCurrency(totalProfit)}
          />
          <Metric
            label="Required total profit"
            value={formatCurrency(requiredTotalProfit)}
            hint="Biggest winning day × 5"
          />
          <Metric
            label="Rule"
            value={`≤ ${formatPercent(maxConsistencyPercent, 0)}`}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="tabular mt-0.5 text-sm font-semibold text-ink-900">
        {value}
      </div>
      {hint && <div className="text-3xs text-ink-400">{hint}</div>}
    </div>
  );
}
