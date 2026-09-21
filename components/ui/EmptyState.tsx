import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-soft text-center",
        compact ? "gap-2 p-6" : "gap-3 p-10",
        className
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-ink-500">
          {icon}
        </div>
      )}
      <div className={cn("space-y-1", compact ? "max-w-xs" : "max-w-md")}>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {description && (
          <p className="text-2xs text-ink-500">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
