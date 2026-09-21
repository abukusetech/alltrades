import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { cn, formatCurrency } from "@/lib/utils";

export interface WithdrawalProgressProps {
  metrics: AccountMetrics;
  startingCapital: number;
}

export function WithdrawalProgress({
  metrics,
  startingCapital,
}: WithdrawalProgressProps) {
  const {
    withdrawalTarget,
    profitTowardTarget,
    amountRemaining,
    targetReached,
  } = metrics;

  const progressPct =
    withdrawalTarget > 0
      ? Math.min(100, (profitTowardTarget / withdrawalTarget) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Withdrawal Target</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            4% of starting capital
          </p>
        </div>
        <Badge tone={targetReached ? "profit" : "neutral"}>
          {targetReached ? "Target reached" : "Target not reached"}
        </Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Starting Capital" value={formatCurrency(startingCapital)} />
          <Metric label="4% Target" value={formatCurrency(withdrawalTarget)} />
          <Metric
            label="Profit Toward Target"
            value={formatCurrency(profitTowardTarget)}
            valueClass="text-profit-text"
          />
          <Metric
            label="Amount Remaining"
            value={formatCurrency(amountRemaining)}
            valueClass={targetReached ? "text-profit-text" : undefined}
          />
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                targetReached ? "bg-profit" : "bg-brand-600"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-3xs text-ink-500">
            <span>{progressPct.toFixed(1)}% of target</span>
            {!targetReached && (
              <span>
                {formatCurrency(amountRemaining)} remains before the withdrawal
                target is reached.
              </span>
            )}
          </div>
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
