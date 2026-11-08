import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  prefix?: string;
  suffix?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, prefix, suffix, type = "text", showPasswordToggle, ...props }, ref) => {
    
    // 1. Password visibility state
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const actualType = isPassword && showPasswordToggle ? (showPassword ? "text" : "password") : type;

    // 2. Build the core input element
    const inputElement = (
      <input
        ref={ref}
        type={actualType}
        className={cn(
          "h-full w-full bg-transparent px-3 text-sm text-ink-900 placeholder:text-ink-400",
          "focus:outline-none disabled:cursor-not-allowed",
          prefix && "pl-1.5",
          (suffix || (isPassword && showPasswordToggle)) && "pr-1.5",
          !prefix && !suffix && !isPassword && !showPasswordToggle && "h-9 rounded border bg-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 focus:ring-offset-white",
          !prefix && !suffix && !isPassword && !showPasswordToggle && invalid
            ? "border-loss focus:ring-loss/40"
            : !prefix && !suffix && !isPassword && !showPasswordToggle
              ? "border-border-strong hover:border-ink-400"
              : "",
          !prefix && !suffix && !isPassword && !showPasswordToggle && "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
          className
        )}
        {...props}
      />
    );

    // 3. If there's no prefix, suffix, or password toggle, render the plain input
    if (!prefix && !suffix && (!isPassword || !showPasswordToggle)) {
      return inputElement;
    }

    // 4. Otherwise, wrap it in a container with the icons/prefixes/suffixes
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
        
        {inputElement}

        {/* Password Toggle Button */}
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="flex h-full items-center justify-center px-3 text-ink-400 hover:text-ink-600 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}

        {suffix && (
          <span className="pr-3 text-sm text-ink-500 select-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
