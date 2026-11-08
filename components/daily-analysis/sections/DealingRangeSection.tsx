"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { DailyAnalysis, DealingRange } from "@/lib/types";
import { cn, formatCurrency, parseNumberOrNull } from "@/lib/utils";

const TIMEFRAMES = ["D1", "H4", "H1", "M30", "M15", "M5", "M1"] as const;

export function DealingRangeSection({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  const range: DealingRange = analysis.dealing_range ?? {
    timeframe: null,
    rangeHigh: null,
    rangeLow: null,
    equilibrium: null,
    currentPrice: null,
    location: null,
    notes: null,
  };

  function set<K extends keyof DealingRange>(key: K, value: DealingRange[K]) {
    onUpdate({ dealing_range: { ...range, [key]: value } });
  }

  // Auto-compute equilibrium from high + low
  React.useEffect(() => {
    const high = range.rangeHigh;
    const low = range.rangeLow;
    if (high != null && low != null && low < high) {
      const eq = Number(((high + low) / 2).toFixed(5));
      if (eq !== range.equilibrium) {
        onUpdate({ dealing_range: { ...range, equilibrium: eq } });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.rangeHigh, range.rangeLow]);

  // Auto-classify location based on current price vs range
  const derivedLocation: "Premium" | "Discount" | "Equilibrium" | null =
    range.currentPrice != null && range.equilibrium != null && range.rangeHigh != null && range.rangeLow != null
      ? range.currentPrice > range.equilibrium
        ? "Premium"
        : range.currentPrice < range.equilibrium
          ? "Discount"
          : "Equilibrium"
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dealing Range</CardTitle>
          <Badge tone="neutral">Optional but recommended</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Range timeframe" htmlFor="range_tf">
              <Select
                id="range_tf"
                value={range.timeframe ?? ""}
                onChange={(e) => set("timeframe", e.target.value || null)}
                options={[...TIMEFRAMES]}
                placeholder="Select"
              />
            </Field>
            <Field label="Range high" htmlFor="range_high" hint="Swing high">
              <Input
                id="range_high"
                type="number"
                step="any"
                value={range.rangeHigh ?? ""}
                onChange={(e) => set("rangeHigh", parseNumberOrNull(e.target.value))}
              />
            </Field>
            <Field label="Range low" htmlFor="range_low" hint="Swing low">
              <Input
                id="range_low"
                type="number"
                step="any"
                value={range.rangeLow ?? ""}
                onChange={(e) => set("rangeLow", parseNumberOrNull(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field
              label="Equilibrium (50%)"
              htmlFor="range_eq"
              hint="Auto-calculated from high + low"
            >
              <Input
                id="range_eq"
                type="number"
                step="any"
                value={range.equilibrium ?? ""}
                disabled
                className="bg-surface-muted"
              />
            </Field>
            <Field
              label="Current price"
              htmlFor="range_price"
              hint="Manual entry (no live feed)"
            >
              <Input
                id="range_price"
                type="number"
                step="any"
                value={range.currentPrice ?? ""}
                onChange={(e) => set("currentPrice", parseNumberOrNull(e.target.value))}
                placeholder="e.g. 1.1730"
              />
            </Field>
            <Field
              label="Location"
              htmlFor="range_loc"
              hint={
                derivedLocation
                  ? `Auto: ${derivedLocation}`
                  : "Set current price to auto-classify"
              }
            >
              <Select
                id="range_loc"
                value={range.location ?? ""}
                onChange={(e) =>
                  set("location", (e.target.value || null) as DealingRange["location"])
                }
                options={["Premium", "Discount", "Equilibrium"]}
                placeholder="Not set"
              />
            </Field>
          </div>

          {range.rangeHigh != null && range.rangeLow != null && range.equilibrium != null && (
            <div className="rounded border border-border bg-surface-soft p-3">
              <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
                Range visualization
              </div>
              <div className="mt-2 space-y-1">
                <RangeBar
                  label="Range high"
                  value={formatCurrency(range.rangeHigh)}
                  position="top"
                  tone="loss"
                />
                <RangeBar
                  label="Equilibrium"
                  value={formatCurrency(range.equilibrium)}
                  position="middle"
                  tone="neutral"
                />
                <RangeBar
                  label="Range low"
                  value={formatCurrency(range.rangeLow)}
                  position="bottom"
                  tone="profit"
                />
              </div>
              {range.currentPrice != null && (
                <div className="mt-3 border-t border-border pt-2 text-2xs">
                  <span className="text-ink-600">Current price: </span>
                  <span className="tabular font-semibold text-ink-900">
                    {formatCurrency(range.currentPrice)}
                  </span>
                  {derivedLocation && (
                    <Badge
                      tone={derivedLocation === "Premium" ? "loss" : derivedLocation === "Discount" ? "profit" : "neutral"}
                      className="ml-2"
                    >
                      {derivedLocation}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          <Field label="Notes" htmlFor="range_notes">
            <Textarea
              id="range_notes"
              rows={2}
              value={range.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
        </CardBody>
      </Card>
    </div>
  );
}

function RangeBar({
  label,
  value,
  position,
  tone,
}: {
  label: string;
  value: string;
  position: "top" | "middle" | "bottom";
  tone: "loss" | "profit" | "neutral";
}) {
  const barClass =
    tone === "loss" ? "bg-loss/30" : tone === "profit" ? "bg-profit/30" : "bg-ink-200";
  return (
    <div className="flex items-center gap-3 text-2xs">
      <div
        className={cn(
          "h-1.5 rounded-full",
          barClass,
          position === "middle" ? "w-full max-w-[200px]" : "w-full max-w-[200px]"
        )}
      />
      <span className="text-ink-600">{label}</span>
      <span className="tabular ml-auto font-medium text-ink-900">{value}</span>
    </div>
  );
}
