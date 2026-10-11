import * as React from "react";
import { cn } from "@/lib/utils";

export interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "profit" | "loss" | "brand" | "warn";
  className?: string;
}

export function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: SummaryCardProps) {
  const valueClass =
    tone === "profit"
      ? "text-profit-text"
      : tone === "loss"
        ? "text-loss-text"
        : tone === "brand"
          ? "text-brand-700"
          : tone === "warn"
            ? "text-warn-text"
            : "text-ink-900";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white p-4 shadow-card",
        className
      )}
    >
      <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className={cn("tabular mt-1.5 text-lg font-semibold", valueClass)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-3xs text-ink-500">{hint}</div>}
    </div>
  );
}

