import { AlertTriangle, ShieldCheck, TrendingDown } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DrawdownStatus } from "@/lib/calc";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface AccountRiskCardProps {
  drawdown: DrawdownStatus;
  maxDailyPercent: number;
  maxTotalPercent: number;
}

export function AccountRiskCard({
  drawdown,
  maxDailyPercent,
  maxTotalPercent,
}: AccountRiskCardProps) {
  const dailyTone = drawdown.dailyBreached
    ? "loss"
    : drawdown.dailyUsagePercent >= 60
      ? "warn"
      : "profit";

  const trailingTone = drawdown.trailingBreached
    ? "loss"
    : drawdown.trailingUsagePercent >= 60
      ? "warn"
      : "profit";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk & Drawdown</CardTitle>
        <Badge tone="neutral">Instant Funding rules</Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Daily */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-2xs text-ink-700">
              {drawdown.dailyBreached ? (
                <AlertTriangle className="h-3.5 w-3.5 text-loss-text" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-profit-text" />
              )}
              Daily drawdown limit ({formatPercent(maxDailyPercent, 0)})
            </div>
            <Badge tone={dailyTone}>
              {drawdown.dailyBreached ? "Breached" : "Within limit"}
            </Badge>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={
                drawdown.dailyBreached
                  ? "h-full bg-loss"
                  : drawdown.dailyUsagePercent >= 60
                    ? "h-full bg-warn"
                    : "h-full bg-profit"
              }
              style={{ width: `${Math.min(100, drawdown.dailyUsagePercent)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-3xs text-ink-600">
            <span>Today P/L: <span className="tabular font-medium text-ink-800">{formatCurrency(drawdown.todayPnL, { showSign: true })}</span></span>
            <span>Budget: <span className="tabular font-medium text-ink-800">{formatCurrency(drawdown.dailyFloorAmount)}</span></span>
          </div>
        </div>

        {/* Trailing */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-2xs text-ink-700">
              {drawdown.trailingBreached ? (
                <AlertTriangle className="h-3.5 w-3.5 text-loss-text" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-ink-500" />
              )}
              Maximum drawdown ({formatPercent(maxTotalPercent, 0)} trailing)
            </div>
            <Badge tone={trailingTone}>
              {drawdown.trailingBreached ? "Breached" : "Within limit"}
            </Badge>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={
                drawdown.trailingBreached
                  ? "h-full bg-loss"
                  : drawdown.trailingUsagePercent >= 60
                    ? "h-full bg-warn"
                    : "h-full bg-profit"
              }
              style={{ width: `${Math.min(100, drawdown.trailingUsagePercent)}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-3xs text-ink-600">
            <span>Watermark: <span className="tabular font-medium text-ink-800">{formatCurrency(drawdown.highestWatermark)}</span></span>
            <span>Floor: <span className="tabular font-medium text-ink-800">{formatCurrency(drawdown.trailingFloor)}</span></span>
          </div>
        </div>

        <p className="border-t border-border pt-3 text-3xs text-ink-500">
          Drawdown values are calculated from your recorded trades and
          withdrawals only. Market conditions — spread and slippage — apply at
          the broker and are outside ALLTRADES&apos; control.
        </p>
      </CardBody>
    </Card>
  );
}
