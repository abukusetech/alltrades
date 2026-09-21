"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
  className?: string;
}

/**
 * Underlined tab strip — restrained, professional.
 */
export function Tabs({ value, onValueChange, items, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-border",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-brand-600 font-medium text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-800"
            )}
          >
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-3xs font-medium",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "bg-ink-100 text-ink-600"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
