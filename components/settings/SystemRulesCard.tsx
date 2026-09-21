import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Account } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface SystemRulesCardProps {
  account: Account | null;
}

export function SystemRulesCard({ account }: SystemRulesCardProps) {
  const year = new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Rules</CardTitle>
        <Badge tone="brand">Automatic</Badge>
      </CardHeader>
      <CardBody>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Row label="Calendar" value={String(year)} />
          <Row
            label="Maximum trades"
            value={account ? `${account.max_weekly_trades} / week` : "3 / week"}
          />
          <Row
            label="Withdrawal target"
            value={
              account
                ? `${formatPercent(Number(account.withdrawal_target_percent), 0)} of starting capital`
                : "4% of starting capital"
            }
          />
          <Row
            label="Withdrawal score"
            value={
              account
                ? `≤ ${formatPercent(Number(account.max_consistency_percent), 0)}`
                : "≤ 20%"
            }
          />
          <Row
            label="Daily drawdown"
            value={
              account
                ? formatPercent(Number(account.max_daily_drawdown_percent), 0)
                : "2%"
            }
          />
          <Row
            label="Maximum drawdown"
            value={
              account
                ? `${formatPercent(Number(account.max_total_drawdown_percent), 0)} trailing`
                : "3% trailing"
            }
          />
          <Row
            label="Floating risk"
            value={
              account
                ? formatPercent(Number(account.max_floating_loss_percent), 0)
                : "1%"
            }
          />
          <Row
            label="Current capital"
            value={account ? "Automatic" : "—"}
            hint={
              account
                ? `${formatCurrency(Number(account.starting_capital))} + P/L − withdrawals`
                : undefined
            }
          />
        </dl>
      </CardBody>
    </Card>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-border bg-surface-soft px-3 py-2">
      <dt className="text-3xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-ink-900">{value}</dd>
      {hint && <p className="mt-0.5 text-3xs text-ink-500">{hint}</p>}
    </div>
  );
}
