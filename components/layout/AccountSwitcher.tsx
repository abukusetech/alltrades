"use client";

import * as React from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import type { Account } from "@/lib/types";

export interface AccountSwitcherProps {
  accounts: Account[];
  currentAccountId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function AccountSwitcher({
  accounts,
  currentAccountId,
  onSelect,
  className,
}: AccountSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = accounts.find((a) => a.id === currentAccountId) ?? null;

  if (accounts.length === 0) {
    return (
      <Link
        href="/settings"
        className={cn(
          "inline-flex items-center gap-2 rounded border border-border-strong bg-white px-3 py-1.5 text-2xs font-medium text-ink-800 transition-colors hover:border-ink-400",
          className
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Create account
      </Link>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded border border-border-strong bg-white px-3 py-1.5 text-2xs transition-colors hover:border-ink-400"
      >
        <span className="text-ink-500">Account:</span>
        <span className="font-medium text-ink-900">
          {current ? current.name : "Select account"}
        </span>
        {current && (
          <span className="tabular text-ink-500">
            {formatCurrency(Number(current.starting_capital))}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-white shadow-raised"
        >
          <div className="border-b border-border px-3 py-2 text-3xs font-medium uppercase tracking-wide text-ink-500">
            Your accounts
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {accounts.map((a) => {
              const active = a.id === currentAccountId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(a.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors",
                      active
                        ? "bg-brand-50 text-ink-900"
                        : "text-ink-700 hover:bg-surface-muted"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.name}</div>
                      <div className="tabular text-3xs text-ink-500">
                        {formatCurrency(Number(a.starting_capital))} starting
                      </div>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-brand-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded px-3 py-2 text-xs text-ink-700 transition-colors hover:bg-surface-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              New account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
