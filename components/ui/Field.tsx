import * as React from "react";
import { cn } from "@/lib/utils";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-2xs font-medium uppercase tracking-wide text-ink-600"
      >
        {label}
        {required && <span className="ml-1 text-loss">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-2xs text-loss-text">{error}</p>
      ) : hint ? (
        <p className="text-2xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
