import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  invalid?: boolean;
  options: readonly (SelectOption | string)[];
  placeholder?: string;
}

/**
 * Professional select with a fixed chevron.
 * `options` accepts either plain strings or { value, label } objects.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, options, placeholder, ...props }, ref) => {
    const normalized: SelectOption[] = options.map((o) =>
      typeof o === "string" ? { value: o, label: o } : o
    );

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-9 w-full appearance-none rounded border bg-white pl-3 pr-9 text-sm text-ink-900 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 focus:ring-offset-white",
            invalid
              ? "border-loss focus:ring-loss/40"
              : "border-border-strong hover:border-ink-400",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
            className
          )}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {normalized.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";
