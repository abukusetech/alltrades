"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DailyAnalysis, ConfirmationState, FinalDecision } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";

/**
 * ANALYSIS COMPLETION
 * Counts required fields across the whole analysis.
 * A field counts if it has a non-empty, non-null value.
 */
function computeCompletion(analysis: DailyAnalysis): { percent: number; complete: number; total: number; missing: string[] } {
  const fields: { name: string; filled: boolean }[] = [
    { name: "Instrument", filled: !!analysis.instrument },
    { name: "HTF bias", filled: !!analysis.higher_timeframe_bias },
    { name: "Market structure", filled: !!analysis.market_structure },
    { name: "Direction", filled: analysis.planned_direction === "BUY" || analysis.planned_direction === "SELL" },
    { name: "Entry", filled: analysis.planned_entry !== null },
    { name: "Stop loss", filled: analysis.planned_stop_loss !== null },
    { name: "Take profit", filled: analysis.planned_take_profit !== null },
    { name: "Risk %", filled: (analysis.planned_risk_percent ?? 0) > 0 },
    { name: "Setup model", filled: !!(analysis as unknown as { setup_model?: string | null }).setup_model },
    { name: "D1 analysis", filled: !!analysis.d1_analysis?.bias },
    { name: "H4 analysis", filled: !!analysis.h4_analysis?.bias },
    { name: "Liquidity narrative", filled: !!analysis.liquidity_narrative?.narrative },
    { name: "At least 1 key zone", filled: false }, // filled later if we fetch zones; for now check the narrative
  ];
  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;
  const missing = fields.filter((f) => !f.filled).map((f) => f.name);
  return { percent: Math.round((filled / total) * 100), complete: filled, total, missing };
}

/**
 * SETUP QUALITY
 * Weighted score based on analysis depth + confirmation.
 * This is a heuristic, not a prediction. Every component is transparent.
 */
function computeSetupQuality(analysis: DailyAnalysis): {
  percent: number;
  components: { label: string; weight: number; achieved: number; reason: string }[];
} {
  const components: { label: string; weight: number; achieved: number; reason: string }[] = [];

  // 1. HTF alignment (20%)
  const htfAligned =
    (analysis.planned_direction === "BUY" &&
      (analysis.higher_timeframe_bias === "Bullish" || analysis.d1_analysis?.bias === "Bullish")) ||
    (analysis.planned_direction === "SELL" &&
      (analysis.higher_timeframe_bias === "Bearish" || analysis.d1_analysis?.bias === "Bearish"));
  components.push({
    label: "HTF alignment",
    weight: 20,
    achieved: htfAligned ? 20 : 0,
    reason: htfAligned ? "Direction agrees with higher timeframe" : "HTF bias not aligned with direction",
  });

  // 2. Liquidity context (15%)
  const hasLiquidity = !!(analysis.liquidity_narrative?.narrative || analysis.liquidity_narrative?.expectedEvent);
  components.push({
    label: "Liquidity context",
    weight: 15,
    achieved: hasLiquidity ? 15 : 0,
    reason: hasLiquidity ? "Liquidity narrative documented" : "No liquidity narrative set",
  });

  // 3. POI quality (15%) — D1 + H4 both analysed
  const poiAnalysed = !!analysis.d1_analysis?.bias && !!analysis.h4_analysis?.bias;
  components.push({
    label: "POI quality",
    weight: 15,
    achieved: poiAnalysed ? 15 : 0,
    reason: poiAnalysed ? "D1 + H4 analysis complete" : "D1 or H4 analysis missing",
  });

  // 4. Structure confirmation (15%) — confirmation states YES for structure
  const states = (analysis.confirmation_states as Record<string, ConfirmationState>) ?? {};
  const structConfirmed = states.structure_confirmed === "YES";
  components.push({
    label: "Structure confirmed",
    weight: 15,
    achieved: structConfirmed ? 15 : 0,
    reason: structConfirmed ? "Market structure confirmed" : "Structure not confirmed",
  });

  // 5. Entry confirmation (15%)
  const entryConfirmed = states.confirmation_candle === "YES" || states.entry_zone_reached === "YES";
  components.push({
    label: "Entry confirmation",
    weight: 15,
    achieved: entryConfirmed ? 15 : 0,
    reason: entryConfirmed ? "Entry confirmation present" : "No entry confirmation",
  });

  // 6. R:R quality (10%)
  const rr = analysis.planned_rr ?? 0;
  const rrGood = rr >= 2 && rr < 3;
  const rrExcellent = rr >= 3;
  const rrScore = rrExcellent ? 10 : rrGood ? 10 : rr >= 1.995 ? 7 : 0;
  components.push({
    label: "R:R quality",
    weight: 10,
    achieved: rrScore,
    reason: rr === 0 ? "No R:R calculated" : rr >= 3 ? "Excellent R:R (1:3+)" : rr >= 2 ? "Good R:R (1:2+)" : "R:R below 1:2",
  });

  // 7. News conditions (10%) — no news exposure = full points
  const newsClear = !analysis.news_major || states.no_news_exposure === "YES";
  components.push({
    label: "News conditions",
    weight: 10,
    achieved: newsClear ? 10 : 0,
    reason: newsClear ? "No news exposure" : "News risk present",
  });

  const achieved = components.reduce((s, c) => s + c.achieved, 0);
  return { percent: achieved, components };
}

/**
 * CONFIRMATION COMPLETION
 */
function computeConfirmation(analysis: DailyAnalysis): { percent: number; yes: number; no: number; na: number; unset: number } {
  const states = (analysis.confirmation_states as Record<string, ConfirmationState>) ?? {};
  const keys = Object.keys(states);
  let yes = 0, no = 0, na = 0;
  for (const k of keys) {
    if (states[k] === "YES") yes++;
    else if (states[k] === "NO") no++;
    else if (states[k] === "NA") na++;
  }
  const applicable = yes + no;
  return { percent: applicable > 0 ? Math.round((yes / applicable) * 100) : 0, yes, no, na, unset: 12 - yes - no - na };
}

export function ScoringSection({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  const completion = React.useMemo(() => computeCompletion(analysis), [analysis]);
  const quality = React.useMemo(() => computeSetupQuality(analysis), [analysis]);
  const confirmation = React.useMemo(() => computeConfirmation(analysis), [analysis]);

  // Final Decision logic
  const finalDecision: FinalDecision =
    analysis.final_decision ??
    (completion.percent < 50
      ? "INCOMPLETE"
      : confirmation.no > 0
        ? "INVALIDATED"
        : confirmation.unset > 0
          ? "WAITING"
          : quality.percent >= 70
            ? "READY"
            : "WAITING");

  function setDecision(decision: FinalDecision) {
    onUpdate({ final_decision: decision });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Analysis Completion</CardTitle>
          <Badge tone={completion.percent === 100 ? "profit" : completion.percent >= 50 ? "warn" : "loss"}>
            {formatPercent(completion.percent, 0)}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                completion.percent === 100 ? "bg-profit" : completion.percent >= 50 ? "bg-warn" : "bg-loss"
              )}
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          <p className="text-2xs text-ink-600">
            {completion.complete} of {completion.total} required fields completed
          </p>
          {completion.missing.length > 0 && (
            <div className="text-3xs text-ink-500">
              Missing: {completion.missing.join(", ")}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Quality</CardTitle>
          <Badge tone={quality.percent >= 70 ? "profit" : quality.percent >= 40 ? "warn" : "loss"}>
            {formatPercent(quality.percent, 0)}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                quality.percent >= 70 ? "bg-profit" : quality.percent >= 40 ? "bg-warn" : "bg-loss"
              )}
              style={{ width: `${quality.percent}%` }}
            />
          </div>
          <div className="space-y-1">
            {quality.components.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-2xs">
                <div>
                  <span className="text-ink-800">{c.label}</span>
                  <span className="ml-1 text-3xs text-ink-500">
                    ({c.achieved}/{c.weight})
                  </span>
                </div>
                <span className="text-3xs text-ink-600">{c.reason}</span>
              </div>
            ))}
          </div>
          <p className="text-3xs text-ink-500 border-t border-border pt-2">
            Setup Quality is a heuristic score, not a prediction. It measures analysis depth and confirmation completeness — it does not predict the outcome of the trade.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmation Completion</CardTitle>
          <Badge tone={confirmation.percent >= 80 ? "profit" : confirmation.percent >= 50 ? "warn" : "loss"}>
            {formatPercent(confirmation.percent, 0)}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                confirmation.percent >= 80 ? "bg-profit" : confirmation.percent >= 50 ? "bg-warn" : "bg-loss"
              )}
              style={{ width: `${confirmation.percent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-2xs">
            <div>
              <div className="text-3xs text-ink-500">Confirmed</div>
              <div className="tabular font-semibold text-profit-text">{confirmation.yes}</div>
            </div>
            <div>
              <div className="text-3xs text-ink-500">Failed</div>
              <div className="tabular font-semibold text-loss-text">{confirmation.no}</div>
            </div>
            <div>
              <div className="text-3xs text-ink-500">Outstanding</div>
              <div className="tabular font-semibold text-warn-text">{confirmation.unset}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Final Decision</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["INCOMPLETE", "WAITING", "READY", "NO_TRADE", "INVALIDATED"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={cn(
                  "rounded border px-2 py-1 text-2xs transition-colors",
                  finalDecision === d
                    ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                    : "border-border text-ink-600 hover:bg-surface-muted"
                )}
              >
                {d.replace("_", " ")}
              </button>
            ))}
          </div>
          <p className="text-3xs text-ink-500">
            The final decision is a record of your intent. Trade Check still enforces account rules independently.
            {finalDecision === "READY" && (
              <> The READY state does not bypass the risk engine — Trade Check must still pass before you trade.</>
            )}
          </p>
          {finalDecision === "READY" && (
            <a
              href={`/trade-check?analysis=${analysis.id}`}
              className="inline-flex items-center gap-1.5 rounded border border-brand-600 bg-brand-50 px-3 py-1.5 text-2xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
            >
              Open Trade Check →
            </a>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

