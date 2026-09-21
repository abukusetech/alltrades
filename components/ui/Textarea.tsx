import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full resize-y rounded border bg-white px-3 py-2 text-sm text-ink-900 transition-colors",
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
Textarea.displayName = "Textarea";
