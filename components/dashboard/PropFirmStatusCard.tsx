import { Building2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Account } from "@/lib/types";
import type { SurvivalSnapshot } from "@/lib/rules";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function PropFirmStatusCard({
  account,
  survival,
}: {
  account: Account;
  survival: SurvivalSnapshot;
}) {
  const propFirm =
    (account as unknown as { prop_firm_name?: string }).prop_firm_name ?? "Maven";
  const maxLossPct = Number(account.max_total_drawdown_percent) || 3;
  const dailyLossPct = Number(account.max_daily_drawdown_percent) || 2;
  const splitPct =
    Number((account as unknown as { profit_split_percent?: number }).profit_split_percent) || 80;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-brand-600" />
          <CardTitle>{propFirm} Account Status</CardTitle>
        </div>
        <Badge
          tone={
            survival.status === "SAFE"
              ? "profit"
              : survival.status === "WARNING"
                ? "warn"
                : "loss"
          }
        >
          {survival.status}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <Row label="Account" value={formatCurrency(Number(account.starting_capital))} />
        <Row
          label="Max Loss"
          value={`${formatPercent(maxLossPct, 2)} / ${formatCurrency(
            (Number(account.starting_capital) * maxLossPct) / 100
          )}`}
        />
        <Row
          label="Daily Loss"
          value={`${formatPercent(dailyLossPct, 2)} / ${formatCurrency(
            (Number(account.starting_capital) * dailyLossPct) / 100
          )}`}
        />
        <Row label="Profit Split" value={`${splitPct.toFixed(0)}%`} />
        <Row
          label="Consistency"
          value={account.max_consistency_percent ? "Required" : "Not required"}
        />

        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <Row
            label="Distance to Daily Loss"
            value={`${formatCurrency(survival.dailyLossRemaining)} remaining`}
            valueClass={
              survival.dailyLossRemaining > 0 ? "text-profit-text" : "text-loss-text"
            }
          />
          <Row
            label="Distance to Max Loss"
            value={`${formatCurrency(survival.maxLossRemaining)} remaining`}
            valueClass={
              survival.maxLossRemaining > 0 ? "text-profit-text" : "text-loss-text"
            }
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
