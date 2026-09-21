import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AccountMetrics } from "@/lib/calc";
import { cn, formatPercent } from "@/lib/utils";

export interface EligibilityPanelProps {
  metrics: AccountMetrics;
  onRecord: () => void;
}

export function EligibilityPanel({ metrics, onRecord }: EligibilityPanelProps) {
  const consistencyOk = metrics.consistencyScore <= metrics.maxConsistencyPercent;
  const eligible = metrics.withdrawalEligible;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eligibility</CardTitle>
        <Badge tone={eligible ? "profit" : "warn"}>
          {eligible ? "Eligible" : "Blocked"}
        </Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        <GateRow
          ok={metrics.targetReached}
          title="Profit target"
          value={
            metrics.targetReached
              ? "Target reached"
              : "Target not reached"
          }
          detail={`Requires ${formatPercent(Number(metrics.maxConsistencyPercent) ? 4 : 4, 0)} of starting capital in profit.`}
        />
        <GateRow
          ok={consistencyOk}
          title="Consistency score"
          value={
            consistencyOk
              ? `Within limit (${formatPercent(metrics.consistencyScore, 1)})`
              : `Above limit (${formatPercent(metrics.consistencyScore, 1)})`
          }
          detail={`Must be ≤ ${formatPercent(metrics.maxConsistencyPercent, 0)}.`}
        />

        <div
          className={cn(
            "rounded border px-3 py-2 text-2xs",
            eligible
              ? "border-profit-border bg-profit-bg text-profit-text"
              : "border-warn-border bg-warn-bg text-warn-text"
          )}
        >
          {eligible
            ? "Both requirements are satisfied. You can record a withdrawal."
            : metrics.withdrawalBlockReason === "TARGET_NOT_REACHED"
              ? "Target not reached — continue trading until the profit target is met."
              : metrics.withdrawalBlockReason === "CONSISTENCY_ABOVE_LIMIT"
                ? "Consistency above limit — continue trading until the score falls to 20% or below."
                : "Withdrawal is currently blocked."}
        </div>

        <Button onClick={onRecord} disabled={!eligible} className="w-full">
          Record Withdrawal
        </Button>
      </CardBody>
    </Card>
  );
}

function GateRow({
  ok,
  title,
  value,
  detail,
}: {
  ok: boolean;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded border border-border bg-surface-soft px-3 py-2">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-3xs text-white",
          ok ? "bg-profit" : "bg-warn"
        )}
        aria-hidden="true"
      >
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs font-medium text-ink-900">{title}</span>
          <span className="tabular text-3xs text-ink-600">{value}</span>
        </div>
        <p className="mt-0.5 text-3xs text-ink-500">{detail}</p>
      </div>
    </div>
  );
}
