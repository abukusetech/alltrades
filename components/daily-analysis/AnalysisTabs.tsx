"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ScanSearch,
  Layers,
  Droplets,
  Crosshair,
  ClipboardCheck,
  GitBranch,
  History,
  CheckCircle2,
} from "lucide-react";

export type AnalysisTabKey =
  | "context"
  | "htf"
  | "liquidity"
  | "ltf"
  | "setup"
  | "confirmation"
  | "scenarios"
  | "review";

export interface AnalysisTab {
  key: AnalysisTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  complete?: boolean;
  disabled?: boolean;
}

export const TABS: AnalysisTab[] = [
  { key: "context", label: "Context", icon: ScanSearch },
  { key: "htf", label: "Higher TF", icon: Layers },
  { key: "liquidity", label: "Liquidity & Zones", icon: Droplets },
  { key: "ltf", label: "Lower TF", icon: Crosshair },
  { key: "setup", label: "Trade Setup", icon: GitBranch },
  { key: "confirmation", label: "Confirmation", icon: ClipboardCheck },
  { key: "scenarios", label: "Scenarios", icon: ScanSearch },
  { key: "review", label: "Post-Market", icon: History },
];

export function AnalysisTabs({
  active,
  onChange,
  completionMap,
}: {
  active: AnalysisTabKey;
  onChange: (key: AnalysisTabKey) => void;
  completionMap?: Partial<Record<AnalysisTabKey, boolean>>;
}) {
  return (
    <div className="-mx-1 flex flex-nowrap gap-1 overflow-x-auto pb-1" role="tablist">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        const isComplete = completionMap?.[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded border px-3 py-1.5 text-2xs transition-colors",
              isActive
                ? "border-brand-600 bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                : "border-border bg-white text-ink-600 hover:bg-surface-muted dark:bg-ink-900 dark:text-ink-300"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            {isComplete && <CheckCircle2 className="h-3 w-3 text-profit-text" />}
          </button>
        );
      })}
    </div>
  );
}
