import { Calendar } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PayoutEligibility } from "@/lib/rules";
import { cn, formatCurrency } from "@/lib/utils";

export function PayoutCountdownCard({ payout }: { payout: PayoutEligibility }) {
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
            : `${payout.daysRemaining} day${payout.daysRemaining === 1 ? "" : "s"} to go`}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="text-center">
          <div className="tabular text-3xl font-semibold text-ink-900">
            {payout.tradingDaysThisMonth}
            <span className="text-ink-400"> / {payout.requiredTradingDays}</span>
          </div>
          <div className="mt-0.5 text-3xs uppercase tracking-wide text-ink-500">
            Trading days
          </div>
        </div>

        <ul className="space-y-2 text-2xs">
          <Gate label="Trading days met" ok={payout.eligibleByDays} />
          <Gate label="Profit target met" ok={payout.eligibleByProfit} />
          <Gate label="Consistency within limit" ok={payout.eligibleByConsistency} />
        </ul>

        <div className="border-t border-border pt-3 text-2xs">
          <Row label="Expected trader share" value={formatCurrency(payout.expectedTraderShare)} />
          <Row label="Estimated payout date" value={payout.payoutEstimateDate} />
        </div>
      </CardBody>
    </Card>
  );
}

function Gate({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-ink-700">{label}</span>
      <span
        className={cn(
          "text-3xs font-medium uppercase tracking-wide",
          ok ? "text-profit-text" : "text-warn-text"
        )}
      >
        {ok ? "✓" : "—"}
      </span>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-600">{label}</span>
      <span className="tabular font-medium text-ink-900">{value}</span>
    </div>
  );
}
