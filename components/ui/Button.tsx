import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary:
    "bg-ink-100 text-ink-900 hover:bg-ink-200 active:bg-ink-300 disabled:bg-ink-100 disabled:text-ink-400",
  outline:
    "border border-border-strong bg-white text-ink-900 hover:bg-surface-muted active:bg-ink-100 disabled:text-ink-400",
  ghost:
    "text-ink-700 hover:bg-ink-100 active:bg-ink-200 disabled:text-ink-400",
  danger:
    "bg-loss text-white hover:bg-loss-dark active:bg-loss-dark disabled:bg-loss/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-2xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-10 px-4 text-sm gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded font-medium transition-colors",
          "disabled:cursor-not-allowed select-none whitespace-nowrap",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = "Button";
