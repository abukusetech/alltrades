import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "profit" | "loss" | "warn" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 border-ink-200",
  profit: "bg-profit-bg text-profit-text border-profit-border",
  loss: "bg-loss-bg text-loss-text border-loss-border",
  warn: "bg-warn-bg text-warn-text border-warn-border",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-3xs font-medium uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
