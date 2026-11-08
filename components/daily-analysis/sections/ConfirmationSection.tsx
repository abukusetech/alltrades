"use client";

import * as React from "react";
import { CheckCircle2, XCircle, MinusCircle, AlertCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DailyAnalysis, ConfirmationState } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIRMATION_ITEMS = [
  { key: "htf_alignment", label: "Higher-timeframe alignment" },
  { key: "structure_confirmed", label: "Market structure confirmed" },
  { key: "direction_confirmed", label: "Direction confirmed" },
  { key: "liquidity_taken", label: "Liquidity taken" },
  { key: "entry_zone_reached", label: "Entry zone reached" },
  { key: "displacement_present", label: "Displacement present" },
  { key: "confirmation_candle", label: "Confirmation candle formed" },
  { key: "no_news_exposure", label: "No prohibited high-impact news exposure" },
  { key: "sl_defined", label: "Stop loss defined" },
  { key: "tp_defined", label: "Take profit defined" },
  { key: "rr_meets_minimum", label: "Reward-to-risk meets minimum (1:2)" },
  { key: "risk_within_limits", label: "Risk within account limits" },
] as const;

export function ConfirmationSection({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  const states: Record<string, ConfirmationState> = (analysis.confirmation_states as Record<string, ConfirmationState>) ?? {};

  function setState(key: string, state: ConfirmationState) {
    const next = { ...states, [key]: state };
    onUpdate({ confirmation_states: next });
  }

  const counts = React.useMemo(() => {
    let yes = 0, no = 0, na = 0, unset = 0;
    for (const item of CONFIRMATION_ITEMS) {
      const s = states[item.key];
      if (s === "YES") yes++;
      else if (s === "NO") no++;
      else if (s === "NA") na++;
      else unset++;
    }
    return { yes, no, na, unset };
  }, [states]);

  const applicable = CONFIRMATION_ITEMS.length - counts.na;
  const percent = applicable > 0 ? Math.round((counts.yes / applicable) * 100) : 0;
  const allApplicableConfirmed = counts.unset === 0 && counts.no === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Checklist</CardTitle>
          <div className="flex items-center gap-2">
            <Badge tone={allApplicableConfirmed ? "profit" : counts.no > 0 ? "loss" : "warn"}>
              {counts.yes}/{applicable} confirmed
            </Badge>
            {counts.unset > 0 && <Badge tone="neutral">{counts.unset} outstanding</Badge>}
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {CONFIRMATION_ITEMS.map((item) => {
            const current = states[item.key];
            return (
              <div
                key={item.key}
                className="flex flex-col gap-2 rounded border border-border bg-surface-soft px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2 text-2xs">
                  {current === "YES" && <CheckCircle2 className="h-3.5 w-3.5 text-profit-text" />}
                  {current === "NO" && <XCircle className="h-3.5 w-3.5 text-loss-text" />}
                  {current === "NA" && <MinusCircle className="h-3.5 w-3.5 text-ink-400" />}
                  {!current && <AlertCircle className="h-3.5 w-3.5 text-ink-300" />}
                  <span className={cn("text-ink-800", current === "NA" && "text-ink-500 line-through")}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setState(item.key, "YES")}
                    className={cn(
                      "rounded border px-2 py-0.5 text-3xs transition-colors",
                      current === "YES"
                        ? "border-profit-border bg-profit-bg text-profit-text font-medium"
                        : "border-border text-ink-600 hover:bg-white"
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setState(item.key, "NO")}
                    className={cn(
                      "rounded border px-2 py-0.5 text-3xs transition-colors",
                      current === "NO"
                        ? "border-loss-border bg-loss-bg text-loss-text font-medium"
                        : "border-border text-ink-600 hover:bg-white"
                    )}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setState(item.key, "NA")}
                    className={cn(
                      "rounded border px-2 py-0.5 text-3xs transition-colors",
                      current === "NA"
                        ? "border-ink-300 bg-ink-100 text-ink-700 font-medium"
                        : "border-border text-ink-600 hover:bg-white"
                    )}
                  >
                    N/A
                  </button>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmation Score</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between text-2xs">
            <span className="text-ink-700">Confirmation completion</span>
            <span className="tabular font-semibold text-ink-900">{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                counts.no > 0 ? "bg-loss" : allApplicableConfirmed ? "bg-profit" : "bg-brand-600"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 text-2xs">
            <Counter label="Confirmed" value={counts.yes} tone="profit" />
            <Counter label="Failed" value={counts.no} tone={counts.no > 0 ? "loss" : "neutral"} />
            <Counter label="N/A" value={counts.na} tone="neutral" />
            <Counter label="Outstanding" value={counts.unset} tone={counts.unset > 0 ? "warn" : "neutral"} />
          </div>

          {counts.no > 0 && (
            <div className="flex items-start gap-2 rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium">{counts.no} condition{counts.no === 1 ? "" : "s"} failed</div>
                <div className="mt-0.5 opacity-80">Trade Check will block this trade until these are resolved.</div>
              </div>
            </div>
          )}

          {allApplicableConfirmed && (
            <div className="flex items-start gap-2 rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium">All applicable conditions confirmed</div>
                <div className="mt-0.5 opacity-80">
                  Trade Check will still enforce account rules (R:R, risk, session, etc.).
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: "profit" | "loss" | "warn" | "neutral" }) {
  const cls =
    tone === "profit" ? "text-profit-text"
    : tone === "loss" ? "text-loss-text"
    : tone === "warn" ? "text-warn-text"
    : "text-ink-700";
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn("tabular text-sm font-semibold", cls)}>{value}</div>
    </div>
  );
}
