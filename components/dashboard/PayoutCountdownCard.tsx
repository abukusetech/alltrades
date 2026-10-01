"use client";

import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PayoutEligibility } from "@/lib/rules";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export function PayoutCountdownCard({
  payout,
  consistencyScore,
  maxConsistencyPercent,
}: {
  payout: PayoutEligibility;
  consistencyScore: number;
  maxConsistencyPercent: number;
}) {
  const pct =
    payout.requiredTradingDays > 0
      ? Math.min(
          100,
          (payout.businessDaysElapsed / payout.requiredTradingDays) * 100
        )
      : 0;

  const consistencyOk = consistencyScore <= maxConsistencyPercent;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand-600" />
          <CardTitle>Next Payout</CardTitle>
        </div>
        <Badge tone={payout.eligibleOverall ? "profit" : "neutral"}>
          {payout.eligibleOverall
            ? "Eligible"
            : `${payout.daysRemaining} business day${
                payout.daysRemaining === 1 ? "" : "s"
              } to go`}
        </Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Cycle progress */}
        <div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xs text-ink-600">
              Business days elapsed
            </div>
            <div className="tabular text-2xs font-semibold text-ink-900">
              {payout.businessDaysElapsed} / {payout.requiredTradingDays}
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                payout.eligibleByDays ? "bg-profit" : "bg-brand-600"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-3xs text-ink-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Started {payout.cycleStartDate}
            </span>
            <span>Target {payout.cycleEndDate}</span>
          </div>
        </div>

        {/* Eligibility gates */}
        <ul className="space-y-2 text-2xs">
          <Gate
            label={`${payout.requiredTradingDays} business days`}
            ok={payout.eligibleByDays}
            detail={
              payout.eligibleByDays
                ? "Reached"
                : `${payout.daysRemaining} remaining (Mon–Fri only)`
            }
          />
          <Gate
            label="Profit target"
            ok={payout.eligibleByProfit}
            detail={payout.eligibleByProfit ? "Reached" : "Not reached"}
          />
          <Gate
            label={`Consistency ≤ ${formatPercent(maxConsistencyPercent, 0)}`}
            ok={consistencyOk}
            detail={`Currently ${formatPercent(consistencyScore, 1)}`}
          />
        </ul>

        {/* Expected share */}
        <div className="border-t border-border pt-3 space-y-2 text-2xs">
          <Row
            label="Expected trader share"
            value={formatCurrency(payout.expectedTraderShare)}
          />
          <Row
            label="Eligible on"
            value={payout.payoutEstimateDate}
            valueClass={payout.eligibleOverall ? "text-profit-text" : undefined}
          />
        </div>

        {/* Final status banner */}
        <div
          className={cn(
            "rounded border px-3 py-2 text-2xs",
            payout.eligibleOverall
              ? "border-profit-border bg-profit-bg text-profit-text"
              : "border-warn-border bg-warn-bg text-warn-text"
          )}
        >
          {payout.eligibleOverall
            ? "All payout requirements satisfied."
            : "Continue trading until all three conditions are met."}
        </div>
      </CardBody>
    </Card>
  );
}

function Gate({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-profit-text" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-ink-300" />
      )}
      <span className="flex-1 text-ink-700">{label}</span>
      <span
        className={cn(
          "tabular text-3xs",
          ok ? "text-profit-text" : "text-ink-500"
        )}
      >
        {detail}
      </span>
    </li>
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-600">{label}</span>
      <span className={cn("tabular font-medium text-ink-900", valueClass)}>
        {value}
      </span>
    </div>
  );
}
