import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface ConsistencyScoreCardProps {
  metrics: AccountMetrics;
}

export function ConsistencyScoreCard({ metrics }: ConsistencyScoreCardProps) {
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

  const usagePct =
    score !== null && maxAllowed > 0
      ? Math.min(100, (score / maxAllowed) * 100)
      : 0;

  const barClass =
    status === "passed"
      ? "bg-profit"
      : status === "na"
        ? "bg-ink-300"
        : "bg-loss";

  const additionalLabel =
    additionalProfitRequired === null
      ? "—"
      : additionalProfitRequired <= 0
        ? "$0.00"
        : formatCurrency(additionalProfitRequired);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Consistency Score</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            Biggest winning day ÷ total net profit × 100
          </p>
        </div>
        <Badge tone={tone}>{badgeLabel}</Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-soft">
            <Icon className={cn("h-5 w-5", iconClass)} />
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "tabular text-3xl font-semibold tracking-tight",
                status === "passed"
                  ? "text-profit-text"
                  : status === "failed"
                    ? "text-loss-text"
                    : "text-ink-500"
              )}
            >
              {score !== null ? formatPercent(score, 1) : "N/A"}
            </div>
            <div className="mt-0.5 text-2xs text-ink-500">
              Maximum allowed: {formatPercent(maxAllowed, 0)} — at or below
              this keeps a withdrawal eligible.
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
            <span>{formatPercent(maxAllowed, 0)} limit</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
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
            label="Current consistency"
            value={score !== null ? formatPercent(score, 1) : "N/A"}
            valueClass={
              status === "passed"
                ? "text-profit-text"
                : status === "failed"
                  ? "text-loss-text"
                  : "text-ink-500"
            }
          />
          <Metric
            label="Maximum allowed"
            value={formatPercent(maxAllowed, 0)}
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
            label="Additional profit needed — detail"
            value={
              additionalProfitRequired !== null
                ? additionalProfitRequired > 0
                  ? `Earn ${formatCurrency(additionalProfitRequired)} more net profit without creating a new biggest winning day`
                  : "Requirement satisfied"
                : "—"
            }
            valueClass="text-ink-600"
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
