import { Card, CardBody } from "@/components/ui/Card";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { AccountMetrics } from "@/lib/calc";

export interface AnalyticsStatsCardsProps {
  metrics: AccountMetrics;
}

export function AnalyticsStatsCards({ metrics }: AnalyticsStatsCardsProps) {
  const totalPnLClass =
    metrics.totalPnL > 0
      ? "text-profit-text"
      : metrics.totalPnL < 0
        ? "text-loss-text"
        : "text-ink-900";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Total Trades"
        value={String(metrics.totalTrades)}
        hint={`${metrics.winningTrades}W · ${metrics.losingTrades}L · ${metrics.breakevenTrades}BE`}
      />
      <Stat
        label="Win Rate"
        value={metrics.winRate != null ? formatPercent(metrics.winRate, 1) : "—"}
        hint={
          metrics.totalTrades > 0
            ? `${metrics.winningTrades} of ${metrics.totalTrades} trades`
            : "No trades yet"
        }
      />
      <Stat
        label="Gross Profit"
        value={formatCurrency(metrics.grossProfit)}
        valueClass="text-profit-text"
        hint={`${metrics.winningTrades} winning trades`}
      />
      <Stat
        label="Gross Loss"
        value={formatCurrency(-metrics.grossLoss)}
        valueClass="text-loss-text"
        hint={`${metrics.losingTrades} losing trades`}
      />
      {/* Hidden but visually balanced row */}
      <div className="hidden sm:block lg:hidden" />
      <div className="hidden lg:block" />
      <div className="hidden lg:block" />
      <div className="hidden lg:block" />
      <div className="sm:col-span-2 lg:col-span-4">
        <Card>
          <CardBody className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <Small
              label="Net P/L"
              value={formatCurrency(metrics.totalPnL, { showSign: true })}
              valueClass={totalPnLClass}
            />
            <Small
              label="Profit Factor"
              value={
                metrics.profitFactor != null
                  ? metrics.profitFactor.toFixed(2)
                  : "—"
              }
            />
            <Small
              label="Average P/L"
              value={
                metrics.averagePnL != null
                  ? formatCurrency(metrics.averagePnL, { showSign: true })
                  : "—"
              }
              valueClass={
                metrics.averagePnL != null
                  ? metrics.averagePnL > 0
                    ? "text-profit-text"
                    : metrics.averagePnL < 0
                      ? "text-loss-text"
                      : undefined
                  : undefined
              }
            />
            <Small
              label="Trading Days"
              value={String(metrics.tradingDays)}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="eyebrow">{label}</div>
        <div
          className={cn(
            "tabular mt-1 text-lg font-semibold text-ink-900",
            valueClass
          )}
        >
          {value}
        </div>
        {hint && <div className="mt-0.5 text-3xs text-ink-500">{hint}</div>}
      </CardBody>
    </Card>
  );
}

function Small({
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
      <div className="text-3xs uppercase tracking-wide text-ink-500">
        {label}
      </div>
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
