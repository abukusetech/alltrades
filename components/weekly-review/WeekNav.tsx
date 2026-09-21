"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatWeekRange } from "@/lib/utils";

export interface WeekNavProps {
  weekStart: Date;
  weekEnd: Date;
  isCurrent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
}

export function WeekNav({
  weekStart,
  weekEnd,
  isCurrent,
  onPrev,
  onNext,
  onToday,
  className,
}: WeekNavProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-[180px] text-center">
          <div className="text-sm font-semibold text-ink-900">
            {formatWeekRange(weekStart, weekEnd)}
          </div>
          <div className="mt-0.5 text-3xs text-ink-500">
            {isCurrent ? "Current week" : "Past week"}
          </div>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <Button variant="outline" size="sm" onClick={onToday}>
        This week
      </Button>
    </div>
  );
}
