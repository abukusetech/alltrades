"use client";

import { Check, Clock, Lock, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountMetrics } from "@/lib/calc";
import { endOfWeek, formatWeekRange, startOfWeek } from "@/lib/utils";

export interface WeeklyDisciplineCardProps {
  metrics: AccountMetrics;
  referenceDate?: Date;
  weeklyLossCount?: number;
  isLocked?: boolean;
}

export function WeeklyDisciplineCard({
  metrics,
  referenceDate = new Date(),
  weeklyLossCount = 0,
  isLocked = false,
}: WeeklyDisciplineCardProps) {
  const { weeklyTradeCount } = metrics;
  
  // HARDCODED TO 5 TRADES PER WEEK AS REQUESTED
  const maxWeeklyTrades = 5; 
  
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
        <Badge tone={isLocked ? "loss" : weeklyTradeCount >= maxWeeklyTrades ? "warn" : "neutral"}>
          {weeklyTradeCount} / {maxWeeklyTrades} Trades
        </Badge>
      </CardHeader>

      <CardBody className="space-y-4">
        
        {/* LOSS LOCK STATUS */}
        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isLocked ? 'border-loss-border bg-loss-bg text-loss-text' : weeklyLossCount > 0 ? 'border-warn-border bg-warn-bg text-warn-text' : 'border-profit-border bg-profit-bg text-profit-text'}`}>
          <div className="flex items-center gap-2">
            {isLocked ? <Lock className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            <span className="text-2xs font-semibold uppercase tracking-wide">
              {isLocked ? "Trading Locked" : "Loss Allowance"}
            </span>
          </div>
          <span className="tabular text-xs font-bold">
            {weeklyLossCount} / 2 Losses
          </span>
        </div>

        <div className="text-2xs text-ink-600">
          Weekly Trades
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

        {weeklyTradeCount >= maxWeeklyTrades && (
          <p className="text-2xs text-warn-text">
            Weekly trade limit reached. No more trades can be recorded.
          </p>
        )}
        {isLocked && (
          <p className="text-2xs text-loss-text">
            Two losses reached. Trading is suspended until next week.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
