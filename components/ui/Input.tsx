import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  prefix?: string;
  suffix?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, prefix, suffix, type = "text", ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div
          className={cn(
            "flex h-9 w-full items-center rounded border bg-white text-sm transition-colors",
            "focus-within:ring-2 focus-within:ring-brand-500/40 focus-within:ring-offset-1 focus-within:ring-offset-white",
            invalid
              ? "border-loss focus-within:ring-loss/40"
              : "border-border-strong hover:border-ink-400",
            props.disabled && "cursor-not-allowed bg-surface-muted opacity-60"
          )}
        >
          {prefix && (
            <span className="pl-3 text-sm text-ink-500 select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "h-full w-full bg-transparent px-3 text-sm text-ink-900 placeholder:text-ink-400",
              "focus:outline-none disabled:cursor-not-allowed",
              prefix && "pl-1.5",
              suffix && "pr-1.5",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="pr-3 text-sm text-ink-500 select-none">
              {suffix}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-9 w-full rounded border bg-white px-3 text-sm text-ink-900 transition-colors",
          "placeholder:text-ink-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 focus:ring-offset-white",
          invalid
            ? "border-loss focus:ring-loss/40"
            : "border-border-strong hover:border-ink-400",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
