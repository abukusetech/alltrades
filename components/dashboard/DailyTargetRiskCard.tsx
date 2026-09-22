import * as React from "react";
import { Target, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface DailyTargetRiskCardProps {
  /** Today's realized P/L (positive or negative). */
  todayPnL: number;
  /** Current account capital (starting + realized - withdrawals). */
  currentCapital: number;
  /** Daily target percentage (e.g. 0.50 for 0.5%). */
  targetPercent: number;
  /** Daily risk percentage (e.g. 0.25 for 0.25%). */
  riskPercent: number;
}

type Level = "safe" | "approaching" | "reached" | "breached";

function levelFromUsage(usagePercent: number): Level {
  if (usagePercent >= 100) return "reached";
  if (usagePercent >= 70) return "approaching";
  return "safe";
}

const BAR: Record<Level, string> = {
  safe: "bg-profit",
  approaching: "bg-warn",
  reached: "bg-profit",
  breached: "bg-loss",
};

const TEXT: Record<Level, string> = {
  safe: "text-profit-text",
  approaching: "text-warn-text",
  reached: "text-profit-text",
  breached: "text-loss-text",
};

export function DailyTargetRiskCard({
  todayPnL,
  currentCapital,
  targetPercent,
  riskPercent,
}: DailyTargetRiskCardProps) {
  // Amounts derived from the current capital
  const targetAmount = (currentCapital * targetPercent) / 100;
  const riskAmount = (currentCapital * riskPercent) / 100;

  // Daily target: how much of the target has been achieved (only positive P/L counts)
  const achievedAmount = Math.max(todayPnL, 0);
  const targetUsage =
    targetAmount > 0 ? (achievedAmount / targetAmount) * 100 : 0;
  const targetRemaining = Math.max(targetAmount - achievedAmount, 0);
  const targetLevel: Level =
    targetUsage >= 100 ? "reached" : levelFromUsage(targetUsage);

  // Daily risk: how much of the risk budget has been consumed (only negative P/L counts)
  const riskUsedAmount = Math.max(-todayPnL, 0);
  const riskUsage = riskAmount > 0 ? (riskUsedAmount / riskAmount) * 100 : 0;
  const riskRemaining = Math.max(riskAmount - riskUsedAmount, 0);
  const riskLevel: Level =
    riskUsage >= 100 ? "breached" : levelFromUsage(riskUsage);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Daily Target & Risk</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            Progress resets every day at 00:00 UTC.
          </p>
        </div>
        <Badge tone={riskLevel === "breached" ? "loss" : "neutral"}>
          Today
        </Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        {/* ---------- DAILY TARGET ---------- */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-profit-text" />
              <div>
                <div className="text-2xs font-medium text-ink-900">
                  Daily Target
                </div>
                <div className="text-3xs text-ink-500">
                  {formatPercent(targetPercent, 2)} of current capital
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "tabular text-sm font-semibold",
                  TEXT[targetLevel]
                )}
              >
                {formatCurrency(achievedAmount)} / {formatCurrency(targetAmount)}
              </div>
              <div className="tabular text-3xs text-ink-500">
                {targetUsage.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                BAR[targetLevel]
              )}
              style={{ width: `${Math.min(100, targetUsage)}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-3xs text-ink-500">
            <span>
              {targetLevel === "reached"
                ? "Daily target reached."
                : `${formatCurrency(targetRemaining)} to go`}
            </span>
            <span>Target {formatCurrency(targetAmount)}</span>
          </div>
        </div>

        {/* ---------- DAILY RISK ---------- */}
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {riskLevel === "breached" ? (
                <ShieldAlert className="h-4 w-4 text-loss-text" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-ink-500" />
              )}
              <div>
                <div className="text-2xs font-medium text-ink-900">
                  Daily Risk
                </div>
                <div className="text-3xs text-ink-500">
                  {formatPercent(riskPercent, 2)} max loss per day
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "tabular text-sm font-semibold",
                  TEXT[riskLevel]
                )}
              >
                {formatCurrency(-riskUsedAmount)} / {formatCurrency(-riskAmount)}
              </div>
              <div className="tabular text-3xs text-ink-500">
                {riskUsage.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                BAR[riskLevel === "reached" ? "approaching" : riskLevel]
              )}
              style={{ width: `${Math.min(100, riskUsage)}%` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-3xs text-ink-500">
            <span>
              {riskLevel === "breached"
                ? "Daily risk limit reached."
                : `${formatCurrency(riskRemaining)} of budget remaining`}
            </span>
            <span>Budget {formatCurrency(riskAmount)}</span>
          </div>
        </div>

        {/* ---------- STATUS BANNER ---------- */}
        {riskLevel === "breached" && (
          <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
            Daily risk limit reached. Consider closing the platform for today.
          </div>
        )}
        {targetLevel === "reached" && riskLevel !== "breached" && (
          <div className="rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
            Daily target achieved. Protect your gains — no need to overtrade.
          </div>
        )}
      </CardBody>
    </Card>
  );
}
