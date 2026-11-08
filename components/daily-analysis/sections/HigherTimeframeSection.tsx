"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { DailyAnalysis, TimeframeAnalysisJson } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_TF: TimeframeAnalysisJson = {
  bias: null,
  structure: null,
  rangeHigh: null,
  rangeLow: null,
  swingHigh: null,
  swingLow: null,
  supplyZones: null,
  demandZones: null,
  orderBlocks: null,
  fvgs: null,
  breakers: null,
  mitigationBlocks: null,
  buySideLiquidity: null,
  sellSideLiquidity: null,
  pdLocation: null,
  drawOnLiquidity: null,
  direction: null,
  entryPOI: null,
  entryTrigger: null,
  confirmation: null,
  invalidation: null,
  notes: null,
};

const BIAS_OPTIONS = ["Bullish", "Bearish", "Neutral", "Range", "Not Analysed"];
const STRUCTURE_OPTIONS = ["BOS", "CHoCH", "MSS", "HH-HL", "LH-LL", "Range", "Not Analysed"];
const PD_OPTIONS = ["Premium", "Discount", "Equilibrium"];

export function HigherTimeframeSection({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  const d1 = analysis.d1_analysis ?? EMPTY_TF;
  const h4 = analysis.h4_analysis ?? EMPTY_TF;
  const h1 = analysis.h1_analysis ?? EMPTY_TF;

  return (
    <div className="space-y-4">
      <TimeframeCard
        title="Daily (D1)"
        subtitle="Overall market environment"
        value={d1}
        onChange={(v) => onUpdate({ d1_analysis: v })}
        fields={[
          "bias",
          "structure",
          "rangeHigh",
          "rangeLow",
          "swingHigh",
          "swingLow",
          "supplyZones",
          "demandZones",
          "fvgs",
          "pdLocation",
          "drawOnLiquidity",
          "notes",
        ]}
        defaultExpanded
      />
      <TimeframeCard
        title="Four-Hour (H4)"
        subtitle="Trading bias and important zones"
        value={h4}
        onChange={(v) => onUpdate({ h4_analysis: v })}
        fields={[
          "bias",
          "structure",
          "orderBlocks",
          "fvgs",
          "breakers",
          "mitigationBlocks",
          "buySideLiquidity",
          "sellSideLiquidity",
          "pdLocation",
          "drawOnLiquidity",
          "notes",
        ]}
        defaultExpanded
      />
      <TimeframeCard
        title="One-Hour (H1)"
        subtitle="Active intraday narrative"
        value={h1}
        onChange={(v) => onUpdate({ h1_analysis: v })}
        fields={[
          "bias",
          "structure",
          "buySideLiquidity",
          "sellSideLiquidity",
          "fvgs",
          "orderBlocks",
          "notes",
        ]}
      />
    </div>
  );
}

function TimeframeCard({
  title,
  subtitle,
  value,
  onChange,
  fields,
  defaultExpanded = false,
}: {
  title: string;
  subtitle: string;
  value: TimeframeAnalysisJson;
  onChange: (v: TimeframeAnalysisJson) => void;
  fields: (keyof TimeframeAnalysisJson)[];
  defaultExpanded?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(!defaultExpanded);

  function set<K extends keyof TimeframeAnalysisJson>(key: K, v: TimeframeAnalysisJson[K]) {
    onChange({ ...value, [key]: v });
  }

  function fieldLabel(key: string): string {
    const map: Record<string, string> = {
      bias: "Bias",
      structure: "Structure",
      rangeHigh: "Range high",
      rangeLow: "Range low",
      swingHigh: "Swing high",
      swingLow: "Swing low",
      supplyZones: "Supply zones",
      demandZones: "Demand zones",
      orderBlocks: "Order blocks",
      fvgs: "Fair value gaps",
      breakers: "Breaker blocks",
      mitigationBlocks: "Mitigation blocks",
      buySideLiquidity: "Buy-side liquidity",
      sellSideLiquidity: "Sell-side liquidity",
      pdLocation: "Premium / Discount",
      drawOnLiquidity: "Expected draw on liquidity",
      notes: "Notes",
    };
    return map[key] ?? key;
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-0.5 text-3xs text-ink-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-3xs text-ink-500 hover:text-ink-800"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </CardHeader>
      {!collapsed && (
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => {
            const key = String(f);
            if (key === "bias" || key === "structure" || key === "pdLocation") {
              const opts =
                key === "bias" ? BIAS_OPTIONS
                : key === "structure" ? STRUCTURE_OPTIONS
                : PD_OPTIONS;
              return (
                <Field key={key} label={fieldLabel(key)} htmlFor={`${title}_${key}`}>
                  <Select
                    id={`${title}_${key}`}
                    value={(value[f] as string) ?? ""}
                    onChange={(e) => set(f, (e.target.value || null) as never)}
                    options={opts}
                    placeholder="Not set"
                  />
                </Field>
              );
            }
            if (key === "notes" || key === "supplyZones" || key === "demandZones" || key === "orderBlocks" || key === "fvgs" || key === "buySideLiquidity" || key === "sellSideLiquidity" || key === "drawOnLiquidity") {
              return (
                <Field key={key} label={fieldLabel(key)} htmlFor={`${title}_${key}`}>
                  <Textarea
                    id={`${title}_${key}`}
                    rows={2}
                    value={(value[f] as string) ?? ""}
                    onChange={(e) => set(f, (e.target.value || null) as never)}
                  />
                </Field>
              );
            }
            // Numeric fields
            return (
              <Field key={key} label={fieldLabel(key)} htmlFor={`${title}_${key}`}>
                <Input
                  id={`${title}_${key}`}
                  type="number"
                  step="any"
                  value={(value[f] as number | null) ?? ""}
                  onChange={(e) => {
                    const n = e.target.value === "" ? null : Number(e.target.value);
                    set(f, (Number.isFinite(n) ? n : null) as never);
                  }}
                />
              </Field>
            );
          })}
        </CardBody>
      )}
    </Card>
  );
}
