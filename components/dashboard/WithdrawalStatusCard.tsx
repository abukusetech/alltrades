import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface WithdrawalStatusCardProps {
  metrics: AccountMetrics;
}

export function WithdrawalStatusCard({ metrics }: WithdrawalStatusCardProps) {
  const {
    withdrawalTarget,
    profitTowardTarget,
    amountRemaining,
    targetReached,
    withdrawalEligible,
    withdrawalBlockReason,
    consistencyScore,
    maxConsistencyPercent,
  } = metrics;

  const progressPercent =
    withdrawalTarget > 0
      ? Math.min(100, (profitTowardTarget / withdrawalTarget) * 100)
      : 0;

  const consistencyOk = consistencyScore <= maxConsistencyPercent;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal Status</CardTitle>
        {withdrawalEligible ? (
          <Badge tone="profit">Eligible</Badge>
        ) : (
          <Badge tone={withdrawalBlockReason === "CONSISTENCY_ABOVE_LIMIT" ? "warn" : "neutral"}>
            {withdrawalBlockReason === "TARGET_NOT_REACHED" && "Target not reached"}
            {withdrawalBlockReason === "CONSISTENCY_ABOVE_LIMIT" && "Consistency above limit"}
            {!withdrawalBlockReason && "In progress"}
          </Badge>
        )}
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Row label="4% Target" value={formatCurrency(withdrawalTarget)} />
          <Row
            label="Profit Toward Target"
            value={formatCurrency(profitTowardTarget)}
            valueClass="text-profit-text"
          />
          <Row label="Amount Remaining" value={formatCurrency(amountRemaining)} />
          <Row
            label="Consistency"
            value={formatPercent(consistencyScore, 1)}
            valueClass={consistencyOk ? "text-ink-900" : "text-warn-text"}
          />
        </div>

        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={
                targetReached
                  ? "h-full bg-profit transition-all"
                  : "h-full bg-brand-600 transition-all"
              }
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 text-2xs text-ink-500">
            {targetReached
              ? "Target reached."
              : `${formatCurrency(amountRemaining)} remains before the withdrawal target is reached.`}
          </div>
        </div>

        <Link href="/withdrawals">
          <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
            Open withdrawal center
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}

function Row({
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
      <div className={`tabular mt-0.5 text-sm font-semibold ${valueClass ?? "text-ink-900"}`}>
        {value}
      </div>
    </div>
  );
}
