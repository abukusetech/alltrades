import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs text-ink-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
