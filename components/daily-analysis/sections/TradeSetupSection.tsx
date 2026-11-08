"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { DailyAnalysis, DirectionOption } from "@/lib/types";
import {
  computeExpectedProfit,
  computeRR,
  computeRiskAmount,
  pipsFromPrices,
} from "@/lib/daily-analysis-calc";
import { cn, formatCurrency, parseNumberOrNull } from "@/lib/utils";

const SETUP_MODELS = [
  "Liquidity sweep reversal",
  "BOS continuation",
  "CHoCH reversal",
  "FVG retracement",
  "Order block mitigation",
  "Breaker block",
  "Support/resistance reaction",
  "Other",
] as const;

export function TradeSetupSection({
  analysis,
  onUpdate,
  accountCapital,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
  accountCapital: number;
}) {
  const instrument = analysis.instrument || "EURUSD";
  const rrWarning = analysis.planned_rr != null && analysis.planned_rr < 1.995;
  const riskAmount = analysis.planned_risk_amount ?? computeRiskAmount(accountCapital, analysis.planned_risk_percent ?? 0);
  const rr = analysis.planned_rr ?? null;
  const expectedProfit = analysis.planned_expected_profit ?? computeExpectedProfit(riskAmount, rr);

  // Pip helpers
  function pipSize() {
    return instrument === "XAUUSD / Gold" ? 0.1 : 0.0001;
  }

  function priceFromPips(pips: number, isSL: boolean) {
    const entry = analysis.planned_entry;
    if (entry == null) return null;
    const direction = analysis.planned_direction;
    const sign = direction === "SELL" ? (isSL ? 1 : -1) : isSL ? -1 : 1;
    return Number((entry + sign * pips * pipSize()).toFixed(5));
  }

  // Local state for pip inputs
  const [slPipsInput, setSlPipsInput] = React.useState("");
  const [tpPipsInput, setTpPipsInput] = React.useState("");

  function applySLPips() {
    const pips = Number(slPipsInput);
    if (!Number.isFinite(pips) || pips <= 0) return;
    const price = priceFromPips(pips, true);
    if (price !== null) {
      onUpdate({ planned_stop_loss: price, planned_sl_pips: pips });
    }
    setSlPipsInput("");
  }
  function applyTPPips() {
    const pips = Number(tpPipsInput);
    if (!Number.isFinite(pips) || pips <= 0) return;
    const price = priceFromPips(pips, false);
    if (price !== null) {
      onUpdate({ planned_take_profit: price });
    }
    setTpPipsInput("");
  }

  // Derived SL pips for display
  const slPipsLive = React.useMemo(() => {
    const raw = pipsFromPrices(analysis.planned_entry, analysis.planned_stop_loss, instrument);
    return raw !== null ? Number(raw.toFixed(1)) : null;
  }, [analysis.planned_entry, analysis.planned_stop_loss, instrument]);

  // ---- Additional JSONB fields for setup details ----
  // We store the extra fields (setup model, TP1, TP2, final target, expected reward)
  // inside the `dealing_range` JSONB or a new field — but for this drop, we use
  // the existing liquidity_narrative pattern... Actually we need a clean place.

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Setup Model</CardTitle>
          <Badge tone={analysis.planned_direction === "WAIT" ? "warn" : analysis.planned_direction ? "brand" : "neutral"}>
            {analysis.planned_direction ?? "Not set"}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Direction" htmlFor="setup_direction">
              <Select
                id="setup_direction"
                value={analysis.planned_direction ?? ""}
                onChange={(e) =>
                  onUpdate({
                    planned_direction: (e.target.value || null) as DirectionOption | null,
                  })
                }
                options={["BUY", "SELL", "WAIT"]}
                placeholder="Select"
              />
            </Field>
            <Field label="Setup model" htmlFor="setup_model">
              <Select
                id="setup_model"
                value={(analysis as unknown as { setup_model?: string | null }).setup_model ?? ""}
                onChange={(e) =>
                  onUpdate({ setup_model: e.target.value || null } as never)
                }
                options={[...SETUP_MODELS]}
                placeholder="Select"
              />
            </Field>
            <Field label="Instrument" htmlFor="setup_instrument">
              <Input id="setup_instrument" value={instrument} disabled />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execution Prices</CardTitle>
          {rrWarning && <Badge tone="warn">RR below plan</Badge>}
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Entry" htmlFor="setup_entry" hint="Full price">
              <Input
                id="setup_entry"
                type="number"
                step="any"
                value={analysis.planned_entry ?? ""}
                onChange={(e) => onUpdate({ planned_entry: parseNumberOrNull(e.target.value) })}
                placeholder="1.0000"
              />
            </Field>
            <Field label="Stop loss" htmlFor="setup_sl" hint="Full price">
              <Input
                id="setup_sl"
                type="number"
                step="any"
                value={analysis.planned_stop_loss ?? ""}
                onChange={(e) => onUpdate({ planned_stop_loss: parseNumberOrNull(e.target.value) })}
                placeholder="1.0000"
              />
            </Field>
            <Field label="Take profit" htmlFor="setup_tp" hint="Full price">
              <Input
                id="setup_tp"
                type="number"
                step="any"
                value={analysis.planned_take_profit ?? ""}
                onChange={(e) => onUpdate({ planned_take_profit: parseNumberOrNull(e.target.value) })}
                placeholder="1.0000"
              />
            </Field>
            <Field label="Risk %" htmlFor="setup_risk">
              <Input
                id="setup_risk"
                type="number"
                step="0.01"
                value={analysis.planned_risk_percent ?? ""}
                onChange={(e) => onUpdate({ planned_risk_percent: parseNumberOrNull(e.target.value) })}
                suffix="%"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Or SL in pips" htmlFor="setup_sl_pips_input" hint="e.g. 12">
              <div className="flex items-center gap-2">
                <Input
                  id="setup_sl_pips_input"
                  type="number"
                  step="1"
                  value={slPipsInput}
                  onChange={(e) => setSlPipsInput(e.target.value)}
                  placeholder="12"
                />
                <Button variant="outline" size="sm" type="button" onClick={applySLPips}>
                  Apply
                </Button>
              </div>
            </Field>
            <Field label="Or TP in pips" htmlFor="setup_tp_pips_input" hint="e.g. 24">
              <div className="flex items-center gap-2">
                <Input
                  id="setup_tp_pips_input"
                  type="number"
                  step="1"
                  value={tpPipsInput}
                  onChange={(e) => setTpPipsInput(e.target.value)}
                  placeholder="24"
                />
                <Button variant="outline" size="sm" type="button" onClick={applyTPPips}>
                  Apply
                </Button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded border border-border bg-surface-soft p-3 sm:grid-cols-4">
            <CalcStat
              label="SL distance"
              value={slPipsLive !== null ? `${slPipsLive.toFixed(1)} pips` : "—"}
            />
            <CalcStat
              label="Risk amount"
              value={`${analysis.planned_risk_percent?.toFixed(2) ?? "—"}% = ${formatCurrency(riskAmount)}`}
            />
            <CalcStat
              label="R:R"
              value={rr !== null ? `1:${rr.toFixed(2)}` : "—"}
              valueClass={rrWarning ? "text-warn-text" : undefined}
            />
            <CalcStat
              label="Expected profit"
              value={rr !== null ? formatCurrency(expectedProfit) : "—"}
              valueClass="text-profit-text"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
          <Badge tone="neutral">Optional</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="TP1 (partial)" htmlFor="setup_tp1" hint="Full price">
              <Input
                id="setup_tp1"
                type="number"
                step="any"
                value={(analysis as unknown as { planned_tp1?: number | null }).planned_tp1 ?? ""}
                onChange={(e) =>
                  onUpdate({ planned_tp1: parseNumberOrNull(e.target.value) } as never)
                }
                placeholder="1.0000"
              />
            </Field>
            <Field label="TP2 (partial)" htmlFor="setup_tp2" hint="Full price">
              <Input
                id="setup_tp2"
                type="number"
                step="any"
                value={(analysis as unknown as { planned_tp2?: number | null }).planned_tp2 ?? ""}
                onChange={(e) =>
                  onUpdate({ planned_tp2: parseNumberOrNull(e.target.value) } as never)
                }
                placeholder="1.0000"
              />
            </Field>
            <Field label="Final target" htmlFor="setup_final" hint="Full price">
              <Input
                id="setup_final"
                type="number"
                step="any"
                value={(analysis as unknown as { planned_final_target?: number | null }).planned_final_target ?? ""}
                onChange={(e) =>
                  onUpdate({ planned_final_target: parseNumberOrNull(e.target.value) } as never)
                }
                placeholder="1.0000"
              />
            </Field>
          </div>
          <Field
            label="Expected reward"
            htmlFor="setup_expected_reward"
            hint="Total expected reward in USD if final target is reached"
          >
            <Input
              id="setup_expected_reward"
              type="number"
              step="0.01"
              value={(analysis as unknown as { planned_expected_reward?: number | null }).planned_expected_reward ?? ""}
              onChange={(e) =>
                onUpdate({ planned_expected_reward: parseNumberOrNull(e.target.value) } as never)
              }
              prefix="$"
            />
          </Field>
        </CardBody>
      </Card>
    </div>
  );
}

function CalcStat({
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
