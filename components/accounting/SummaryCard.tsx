import * as React from "react";
import { cn } from "@/lib/utils";

export interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "profit" | "loss" | "brand" | "warn";
  className?: string;
}

const TONE_STYLES = {
  neutral: "border-l-ink-300",
  profit: "border-l-profit",
  loss: "border-l-loss",
  brand: "border-l-brand-600",
  warn: "border-l-warn",
} as const;

const VALUE_STYLES = {
  neutral: "text-ink-900",
  profit: "text-profit-text",
  loss: "text-loss-text",
  brand: "text-brand-700",
  warn: "text-warn-text",
} as const;

export function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border border-l-[3px] bg-white p-4 shadow-card transition-shadow hover:shadow-sm",
        TONE_STYLES[tone],
        className
      )}
    >
      <div className="text-3xs font-semibold uppercase tracking-[0.08em] text-ink-500">
        {label}
      </div>
      <div className={cn("tabular mt-2 break-words text-xl font-semibold tracking-tight", VALUE_STYLES[tone])}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-3xs leading-relaxed text-ink-500">{hint}</div>}
    </div>
  );
}
