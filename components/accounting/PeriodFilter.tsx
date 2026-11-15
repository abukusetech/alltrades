"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type PeriodKind = "month" | "quarter" | "year" | "custom" | "all";

export interface PeriodValue {
  kind: PeriodKind;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computePeriod(kind: PeriodKind, custom?: { from: string; to: string }): PeriodValue {
  const now = new Date();
  if (kind === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { kind, from: iso(from), to: iso(to) };
  }
  if (kind === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    const to = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { kind, from: iso(from), to: iso(to) };
  }
  if (kind === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31);
    return { kind, from: iso(from), to: iso(to) };
  }
  if (kind === "all") {
    return { kind, from: "1970-01-01", to: iso(now) };
  }
  return {
    kind: "custom",
    from: custom?.from ?? iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: custom?.to ?? iso(now),
  };
}

const OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (next: PeriodValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() =>
              onChange(
                computePeriod(
                  o.value,
                  o.value === "custom" ? { from: value.from, to: value.to } : undefined
                )
              )
            }
            className={cn(
              "rounded border px-2 py-1 text-3xs transition-colors",
              value.kind === o.value
                ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                : "border-border text-ink-600 hover:bg-surface-muted"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {value.kind === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="h-7 rounded border border-border-strong px-2 text-3xs"
          />
          <span className="text-3xs text-ink-500">to</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="h-7 rounded border border-border-strong px-2 text-3xs"
          />
        </div>
      )}

      <span className="text-3xs text-ink-500">
        {value.from} → {value.to}
      </span>
    </div>
  );
}
