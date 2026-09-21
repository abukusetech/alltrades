import * as React from "react";
import { cn } from "@/lib/utils";

export function TableWrap({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-border bg-white",
        className
      )}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("bg-surface-muted text-2xs uppercase tracking-wide text-ink-500", className)}
      {...props}
    />
  );
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-soft", className)}
      {...props}
    />
  );
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-2.5 text-left font-medium",
        className
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("whitespace-nowrap px-4 py-3 text-sm text-ink-800", className)}
      {...props}
    />
  );
}
