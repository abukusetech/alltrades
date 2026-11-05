import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface ConsistencySummaryCardProps {
  metrics: AccountMetrics;
}

export function ConsistencySummaryCard({ metrics }: ConsistencySummaryCardProps) {
  const c = metrics.consistency;
  const {
    biggestWinningDay,
    totalProfit,
    score,
    maxAllowed,
    status,
    additionalProfitRequired,
  } = c;

  const Icon =
    status === "passed" ? ShieldCheck : status === "na" ? ShieldAlert : ShieldX;

  const iconClass =
    status === "passed"
      ? "text-profit-text"
      : status === "na"
        ? "text-ink-400"
        : "text-loss-text";

  const tone =
    status === "passed" ? "profit" : status === "na" ? "neutral" : "loss";

  const badgeLabel =
    status === "passed" ? "PASSED" : status === "na" ? "N/A" : "NOT PASSED";

  const additionalLabel =
    additionalProfitRequired === null
      ? "—"
      : additionalProfitRequired <= 0
        ? "$0.00"
        : formatCurrency(additionalProfitRequired);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consistency Score</CardTitle>
        <Badge tone={tone}>{badgeLabel}</Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} />
          <div>
            <div
              className={cn(
                "tabular text-2xl font-semibold tracking-tight",
                status === "passed"
                  ? "text-profit-text"
                  : status === "failed"
                    ? "text-loss-text"
                    : "text-ink-500"
              )}
            >
              {score !== null ? formatPercent(score, 1) : "N/A"}
            </div>
            <p className="mt-0.5 text-2xs text-ink-500">
              Maximum allowed: {formatPercent(maxAllowed, 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Metric
            label="Biggest winning day"
            value={formatCurrency(biggestWinningDay)}
          />
          <Metric
            label="Total net profit"
            value={formatCurrency(totalProfit, { showSign: true })}
            valueClass={
              totalProfit > 0
                ? "text-profit-text"
                : totalProfit < 0
                  ? "text-loss-text"
                  : undefined
            }
          />
          <Metric
            label="Additional profit to reach 20%"
            value={additionalLabel}
            valueClass={
              additionalProfitRequired !== null && additionalProfitRequired > 0
                ? "text-warn-text"
                : "text-profit-text"
            }
          />
          <Metric
            label="Maximum allowed"
            value={formatPercent(maxAllowed, 0)}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div
        className={cn(
          "tabular mt-0.5 text-sm font-semibold text-ink-900",
          valueClass
        )}
      >
        {value}
      </div>
    </div>
  );
}
