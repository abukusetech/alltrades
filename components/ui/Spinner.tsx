import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  size = "md",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  } as const;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center text-ink-500", className)}
      {...props}
    >
      <Loader2 className={cn("animate-spin", sizes[size])} aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * Full-page loading state.
 */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-500">
      <Spinner size="lg" />
      <p className="text-2xs">{label}</p>
    </div>
  );
}

/**
 * Inline block loading state for tables and lists.
 */
export function BlockLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-500">
      <Spinner />
      <span className="text-2xs">{label}</span>
    </div>
  );
}
