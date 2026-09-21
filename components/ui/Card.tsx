import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white shadow-card",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border px-5 py-4",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-ink-900", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-2xs text-ink-500", className)} {...props} />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-5 py-3",
        className
      )}
      {...props}
    />
  );
}

/**
 * Metric card — used for Current Capital, Total P/L, etc.
 * Keep metric typography consistent across the app.
 */
export function MetricCard({
  label,
  value,
  valueClassName,
  hint,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white p-5 shadow-card",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {icon && <span className="text-ink-400">{icon}</span>}
      </div>
      <div className={cn("metric mt-2 text-ink-900", valueClassName)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-2xs text-ink-500">{hint}</div>}
    </div>
  );
}
