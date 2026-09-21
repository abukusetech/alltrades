import { Check, Clock } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { endOfWeek, formatWeekRange, startOfWeek } from "@/lib/utils";

export interface WeeklyDisciplineCardProps {
  metrics: AccountMetrics;
  referenceDate?: Date;
}

export function WeeklyDisciplineCard({
  metrics,
  referenceDate = new Date(),
}: WeeklyDisciplineCardProps) {
  const { weeklyTradeCount, maxWeeklyTrades, weeklyLimitReached } = metrics;
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = endOfWeek(referenceDate);

  const slots = Array.from({ length: maxWeeklyTrades }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Weekly Discipline</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            {formatWeekRange(weekStart, weekEnd)}
          </p>
        </div>
        <Badge tone={weeklyLimitReached ? "warn" : "neutral"}>
          {weeklyTradeCount} / {maxWeeklyTrades}
        </Badge>
      </CardHeader>

      <CardBody className="space-y-3">
        <div className="text-2xs text-ink-600">
          Trades this week
        </div>

        <ul className="space-y-1.5">
          {slots.map((i) => {
            const completed = i < weeklyTradeCount;
            return (
              <li
                key={i}
                className="flex items-center justify-between rounded border border-border bg-surface-soft px-3 py-1.5 text-2xs"
              >
                <span className="flex items-center gap-2 text-ink-700">
                  {completed ? (
                    <Check className="h-3.5 w-3.5 text-profit-text" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-ink-400" />
                  )}
                  Trade {i + 1}
                </span>
                <span
                  className={
                    completed
                      ? "font-medium text-profit-text"
                      : "text-ink-500"
                  }
                >
                  {completed ? "Completed" : "Available"}
                </span>
              </li>
            );
          })}
        </ul>

        {weeklyLimitReached && (
          <p className="text-2xs text-warn-text">
            Weekly trade limit reached. New trades are blocked until next week.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
