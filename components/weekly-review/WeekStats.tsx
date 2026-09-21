import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { WeeklyAggregate } from "@/lib/calc";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface WeekStatsProps {
  week: WeeklyAggregate;
}

export function WeekStats({ week }: WeekStatsProps) {
  const pnlClass =
    week.totalPnL > 0
      ? "text-profit-text"
      : week.totalPnL < 0
        ? "text-loss-text"
        : "text-ink-700";

  const biggestWinClass =
    week.biggestWinningDay > 0 ? "text-profit-text" : "text-ink-700";
  const biggestLossClass =
    week.biggestLosingDay < 0 ? "text-loss-text" : "text-ink-700";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Total trades" value={String(week.totalTrades)} />
      <Stat
        label="Win rate"
        value={week.winRate != null ? formatPercent(week.winRate, 1) : "—"}
        hint={`${week.winningTrades}W · ${week.losingTrades}L · ${week.breakevenTrades}BE`}
      />
      <Stat
        label="Total P/L"
        value={formatCurrency(week.totalPnL, { showSign: true })}
        valueClass={pnlClass}
      />
      <Stat
        label="Average P/L"
        value={
          week.averagePnL != null
            ? formatCurrency(week.averagePnL, { showSign: true })
            : "—"
        }
        valueClass={
          week.averagePnL != null
            ? week.averagePnL > 0
              ? "text-profit-text"
              : week.averagePnL < 0
                ? "text-loss-text"
                : undefined
            : undefined
        }
      />

      <Stat
        label="Biggest winning day"
        value={formatCurrency(week.biggestWinningDay)}
        valueClass={biggestWinClass}
      />
      <Stat
        label="Biggest losing day"
        value={formatCurrency(week.biggestLosingDay)}
        valueClass={biggestLossClass}
      />
      <Stat
        label="Consistency score"
        value={formatPercent(week.consistencyScore, 1)}
      />
      <Stat
        label="Weekly trade count"
        value={String(week.totalTrades)}
        hint={`Mon ${week.weekStart} → Sun ${week.weekEnd}`}
      />
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
