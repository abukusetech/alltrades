import { ShieldCheck, AlertTriangle, ShieldX, Target } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { SurvivalSnapshot } from "@/lib/rules";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export function AccountSurvivalCard({ survival }: { survival: SurvivalSnapshot }) {
  const statusTone =
    survival.status === "BREACHED"
      ? "loss"
      : survival.status === "DANGER"
        ? "loss"
        : survival.status === "WARNING"
          ? "warn"
          : "profit";

  const Icon =
    survival.status === "SAFE"
      ? ShieldCheck
      : survival.status === "BREACHED"
        ? ShieldX
        : AlertTriangle;

  const iconClass =
    survival.status === "SAFE"
      ? "text-profit-text"
      : survival.status === "WARNING"
        ? "text-warn-text"
        : "text-loss-text";

  const dailyBar =
    survival.dailyLevel === "breached"
      ? "bg-loss"
      : survival.dailyLevel === "approaching"
        ? "bg-warn"
        : "bg-profit";

  const maxBar =
    survival.maxLevel === "breached"
      ? "bg-loss"
      : survival.maxLevel === "approaching"
        ? "bg-warn"
        : "bg-profit";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Account Survival</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            {formatCurrency(survival.capital)} equity · Protect the account first.
          </p>
        </div>
        <Badge tone={statusTone}>{survival.status}</Badge>
      </CardHeader>

      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-soft">
            <Icon className={cn("h-5 w-5", iconClass)} />
          </div>
          <div className="min-w-0">
            <div className="text-2xs text-ink-500">{survival.headline}</div>
            <div className="tabular mt-0.5 text-lg font-semibold text-ink-900">
              {formatCurrency(survival.capital)}
            </div>
          </div>
        </div>

        {/* Daily loss */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-2xs">
            <span className="text-ink-700">Daily Loss Remaining</span>
            <span className="tabular font-semibold text-ink-900">
              {formatCurrency(survival.dailyLossRemaining)} /{" "}
              {formatCurrency(survival.dailyLossLimit)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full transition-all", dailyBar)}
              style={{ width: `${survival.dailyUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-3xs text-ink-500">
            <span>Used {formatCurrency(survival.dailyLossUsed)}</span>
            <span>{formatPercent(survival.dailyUsagePercent, 0)}</span>
          </div>
        </div>

        {/* Max loss */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-2xs">
            <span className="text-ink-700">Max Loss Remaining</span>
            <span className="tabular font-semibold text-ink-900">
              {formatCurrency(survival.maxLossRemaining)} /{" "}
              {formatCurrency(survival.maxLossLimit)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full transition-all", maxBar)}
              style={{ width: `${survival.maxUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-3xs text-ink-500">
            <span>Used {formatCurrency(survival.maxLossUsed)}</span>
            <span>{formatPercent(survival.maxUsagePercent, 0)}</span>
          </div>
        </div>

        {/* Personal stop */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between text-2xs">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-ink-500" />
              <span className="text-ink-700">Personal Stop Today</span>
            </div>
            <span className="tabular font-semibold text-ink-900">
              {formatCurrency(survival.personalStopRemaining)} /{" "}
              {formatCurrency(survival.personalStopAmount)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                survival.personalStopHit ? "bg-loss" : "bg-brand-600"
              )}
              style={{
                width: `${
                  survival.personalStopAmount > 0
                    ? Math.min(
                        100,
                        (survival.personalStopUsed / survival.personalStopAmount) * 100
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          {survival.personalStopHit && (
            <p className="text-3xs text-loss-text">
              Personal stop hit — no more trades today.
            </p>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          <Mini label="Today's trades" value={String(survival.todayTrades)} />
          <Mini
            label="Today P/L"
            value={formatCurrency(survival.todayPnL, { showSign: true })}
            valueClass={
              survival.todayPnL > 0
                ? "text-profit-text"
                : survival.todayPnL < 0
                  ? "text-loss-text"
                  : undefined
            }
          />
          <Mini
            label="Traded today"
            value={survival.todayTraded ? "Yes" : "No"}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function Mini({
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
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn("tabular mt-0.5 text-xs font-semibold text-ink-900", valueClass)}>
        {value}
      </div>
    </div>
  );
}
