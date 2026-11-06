"use client";

import * as React from "react";
import { AlertTriangle, ShieldCheck, TrendingDown, Settings2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DrawdownStatus } from "@/lib/calc";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

export interface AccountRiskCardProps {
  drawdown: DrawdownStatus;
  maxDailyPercent: number;
  maxTotalPercent: number;
  currentEquity: number;
  consistencyScore: number | null;
  mostProfitableDay: number;
  totalProfits: number;
  accountId: string;
}

export function AccountRiskCard({
  drawdown,
  maxDailyPercent,
  maxTotalPercent,
  currentEquity,
  consistencyScore,
  mostProfitableDay,
  totalProfits,
  accountId,
}: AccountRiskCardProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const router = useRouter();
  const [syncing, setSyncing] = React.useState(false);

  // 1. Daily Loss Math
  const dailyUsed = Math.abs(Math.min(drawdown.todayPnL, 0));
  const dailyLimit = drawdown.dailyFloorAmount;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

  // 2. Max Trailing Loss Math
  const watermark = drawdown.highestWatermark;
  const maxLimit = watermark * (maxTotalPercent / 100);
  const trailingFloor = watermark - maxLimit;
  const trailingUsed = watermark - currentEquity;
  const trailingRemaining = currentEquity - trailingFloor;

  // Status Tones
  const dailyTone = drawdown.dailyBreached ? "loss" : dailyUsed > dailyLimit * 0.7 ? "warn" : "profit";
  const trailingTone = drawdown.trailingBreached ? "loss" : trailingUsed > maxLimit * 0.7 ? "warn" : "profit";

  async function handleSync() {
    const val = window.prompt(
      "Enter the exact Trailing High-Water Mark from Maven:",
      watermark.toString()
    );
    if (val === null) return;
    
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      return toast.error("Please enter a valid positive number");
    }

    setSyncing(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ watermark_override: num })
        .eq("id", accountId);

      if (error) throw error;
      
      toast.success("Watermark synced successfully");
      router.refresh();
    } catch (e) {
      toast.error("Failed to sync", e instanceof Error ? e.message : undefined);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* --- Maven Drawdown Specifics --- */}
      <Card>
        <CardHeader>
          <CardTitle>Account Limits</CardTitle>
          <Badge tone="neutral">Instant Funding</Badge>
        </CardHeader>
        <CardBody className="space-y-6">
          
          {/* Maximum Loss */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs font-medium">
              <span className="text-ink-700 flex items-center gap-1">
                {drawdown.trailingBreached ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-loss-text" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-ink-500" />
                )}
                Maximum loss limit
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="ml-1 rounded p-0.5 text-ink-400 hover:bg-surface-muted hover:text-ink-700 disabled:opacity-50"
                  title="Sync Watermark from Maven"
                >
                  <Settings2 className="h-3 w-3" />
                </button>
              </span>
              <span className={trailingTone === "profit" ? "text-profit-text" : trailingTone === "warn" ? "text-warn-text" : "text-loss-text"}>
                {formatCurrency(trailingUsed)} / {formatCurrency(maxLimit)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full ${trailingTone === "profit" ? "bg-profit" : trailingTone === "warn" ? "bg-warn" : "bg-loss"}`}
                style={{ width: `${Math.min(100, Math.max(0, (trailingUsed / maxLimit) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-3xs text-ink-500">
              <span>{((trailingUsed / maxLimit) * 100).toFixed(2)}%</span>
              <span>Remaining: {formatCurrency(Math.max(0, trailingRemaining))}</span>
            </div>
          </div>

          {/* Daily Loss */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs font-medium">
              <span className="text-ink-700 flex items-center gap-1">
                {drawdown.dailyBreached ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-loss-text" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-profit-text" />
                )}
                Daily loss limit
              </span>
              <span className={dailyTone === "profit" ? "text-profit-text" : dailyTone === "warn" ? "text-warn-text" : "text-loss-text"}>
                {formatCurrency(dailyUsed)} / {formatCurrency(dailyLimit)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full ${dailyTone === "profit" ? "bg-profit" : dailyTone === "warn" ? "bg-warn" : "bg-loss"}`}
                style={{ width: `${Math.min(100, Math.max(0, (dailyUsed / dailyLimit) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-3xs text-ink-500">
              <span>{((dailyUsed / (dailyLimit || 1)) * 100).toFixed(2)}%</span>
              <span>Remaining: {formatCurrency(dailyRemaining)}</span>
            </div>
          </div>

        </CardBody>
      </Card>

      {/* --- Maven Consistency Specifics --- */}
      <Card>
        <CardHeader>
          <CardTitle>Consistency Score</CardTitle>
          <Badge tone={consistencyScore === null ? "warn" : "profit"}>
            {consistencyScore === null ? "Pending" : `${consistencyScore.toFixed(1)}%`}
          </Badge>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xs uppercase tracking-wide text-ink-500">Most profitable day</div>
            <div className="tabular mt-0.5 text-sm font-semibold text-ink-900">{formatCurrency(mostProfitableDay)}</div>
          </div>
          <div>
            <div className="text-3xs uppercase tracking-wide text-ink-500">Total profits</div>
            <div className="tabular mt-0.5 text-sm font-semibold text-ink-900">{formatCurrency(totalProfits, { showSign: true })}</div>
          </div>
          {consistencyScore === null && (
            <div className="col-span-2 text-3xs text-warn-text">
              Needs positive profit to calculate.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
