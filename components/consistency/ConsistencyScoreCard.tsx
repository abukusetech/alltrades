import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface ConsistencyScoreCardProps {
  metrics: AccountMetrics;
}

export function ConsistencyScoreCard({ metrics }: ConsistencyScoreCardProps) {
  const {
    consistencyScore,
    maxConsistencyPercent,
    consistencyStatus,
    biggestWinningDay,
    totalProfit,
    requiredTotalProfit,
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

  const label =
    consistencyStatus === "over"
      ? "Above withdrawal limit"
      : consistencyStatus === "approaching"
        ? "Approaching limit"
        : "Within withdrawal limit";

  const usagePct = Math.min(100, (consistencyScore / maxConsistencyPercent) * 100);
  const barClass =
    consistencyStatus === "over"
      ? "bg-loss"
      : consistencyStatus === "approaching"
        ? "bg-warn"
        : "bg-profit";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Consistency Score</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            Biggest winning day ÷ total profit × 100
          </p>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-soft"
            )}
          >
            <Icon className={cn("h-5 w-5", iconClass)} />
          </div>
          <div className="min-w-0">
            <div className="tabular text-3xl font-semibold tracking-tight text-ink-900">
              {formatPercent(consistencyScore, 1)}
            </div>
            <div className="mt-0.5 text-2xs text-ink-500">
              Limit: {formatPercent(maxConsistencyPercent, 0)} — your score must
              stay at or below this for a withdrawal to be allowed.
            </div>
          </div>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full transition-all", barClass)}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-3xs text-ink-500">
            <span>0%</span>
            <span>{formatPercent(maxConsistencyPercent, 0)} limit</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <Metric
            label="Biggest winning day"
            value={formatCurrency(biggestWinningDay)}
          />
          <Metric label="Total profit" value={formatCurrency(totalProfit)} />
          <Metric
            label="Required total profit"
            value={formatCurrency(requiredTotalProfit)}
            hint="Biggest winning day × 5"
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
      {hint && <div className="mt-0.5 text-3xs text-ink-400">{hint}</div>}
    </div>
  );
}
