import { DollarSign } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ProfitSplit } from "@/lib/rules";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function ProfitSplitCard({ split }: { split: ProfitSplit }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-brand-600" />
          <CardTitle>Profit Split</CardTitle>
        </div>
        <Badge tone="brand">{formatPercent(split.splitPercent, 0)} trader</Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <Row label="Gross Profit" value={formatCurrency(split.grossProfit)} />
        <Row
          label={`Your ${split.splitPercent.toFixed(0)}%`}
          value={formatCurrency(split.traderShare)}
          valueClass="text-profit-text"
        />
        <Row
          label={`Firm ${(100 - split.splitPercent).toFixed(0)}%`}
          value={formatCurrency(split.firmShare)}
        />
        <div className="border-t border-border pt-3">
          <Row
            label="Already withdrawn"
            value={formatCurrency(split.alreadyWithdrawn)}
          />
          <Row
            label="Available Payout"
            value={formatCurrency(split.availablePayout)}
            valueClass="text-profit-text font-semibold"
          />
        </div>
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
    <div className="flex items-center justify-between gap-3 text-2xs">
      <span className="text-ink-600">{label}</span>
      <span className={`tabular font-medium ${valueClass ?? "text-ink-900"}`}>{value}</span>
    </div>
  );
}
