"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
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
  supplyZones: null,
  demandZones: null,
  orderBlocks: null,
  fvgs: null,
  buySideLiquidity: null,
  sellSideLiquidity: null,
  direction: null,
  entryPOI: null,
  entryTrigger: null,
  confirmation: null,
  invalidation: null,
  notes: null,
};

const BIAS_OPTIONS = ["Bullish", "Bearish", "Neutral", "Range", "Not Analysed"];
const STRUCTURE_OPTIONS = ["BOS", "CHoCH", "MSS", "Range", "Not Analysed"];

export function LowerTimeframeSection({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  const m30 = analysis.m30_analysis ?? EMPTY_TF;
  const m15 = analysis.m15_analysis ?? EMPTY_TF;
  const m5 = analysis.m5_analysis ?? EMPTY_TF;
  const m1 = analysis.m1_analysis ?? EMPTY_TF;

  return (
    <div className="space-y-4">
      <TimeframeCard
        title="Thirty-Minute (M30)"
        subtitle="Refine the trading area"
        value={m30}
        onChange={(v) => onUpdate({ m30_analysis: v })}
        fields={["bias", "structure", "rangeHigh", "rangeLow", "orderBlocks", "fvgs", "buySideLiquidity", "sellSideLiquidity", "notes"]}
      />
      <TimeframeCard
        title="Fifteen-Minute (M15)"
        subtitle="Identify the setup"
        value={m15}
        onChange={(v) => onUpdate({ m15_analysis: v })}
        fields={["bias", "structure", "orderBlocks", "fvgs", "entryPOI", "confirmation", "notes"]}
        defaultExpanded
      />
      <TimeframeCard
        title="Five-Minute (M5)"
        subtitle="Monitor confirmation"
        value={m5}
        onChange={(v) => onUpdate({ m5_analysis: v })}
        fields={["bias", "structure", "entryPOI", "entryTrigger", "confirmation", "invalidation", "notes"]}
        defaultExpanded
      />
      <TimeframeCard
        title="One-Minute (M1)"
        subtitle="Refine execution"
        value={m1}
        onChange={(v) => onUpdate({ m1_analysis: v })}
        fields={["entryTrigger", "confirmation", "invalidation", "notes"]}
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
      orderBlocks: "Order blocks",
      fvgs: "Fair value gaps",
      buySideLiquidity: "Buy-side liquidity",
      sellSideLiquidity: "Sell-side liquidity",
      entryPOI: "Entry POI",
      entryTrigger: "Entry trigger",
      confirmation: "Confirmation expected",
      invalidation: "Invalidation",
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
            if (key === "bias" || key === "structure") {
              const opts = key === "bias" ? BIAS_OPTIONS : STRUCTURE_OPTIONS;
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
            if (["notes", "orderBlocks", "fvgs", "buySideLiquidity", "sellSideLiquidity", "entryPOI", "entryTrigger", "confirmation", "invalidation"].includes(key)) {
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
