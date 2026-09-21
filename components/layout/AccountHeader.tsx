import * as React from "react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Account } from "@/lib/types";

export interface AccountHeaderProps {
  account: Account | null;
  currentCapital: number;
  className?: string;
}

/**
 * Consistent account banner shown at the top of every workspace page.
 * Data comes entirely from the selected account — never hardcoded.
 */
export function AccountHeader({
  account,
  currentCapital,
  className,
}: AccountHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-surface-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-3xs font-medium uppercase tracking-wider text-ink-500">
          Account
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-ink-900">
          {account ? account.name : "No account selected"}
        </div>
        {account && (
          <div className="mt-0.5 text-3xs text-ink-500">
            Starting capital{" "}
            <span className="tabular text-ink-700">
              {formatCurrency(Number(account.starting_capital))}
            </span>
          </div>
        )}
      </div>

      <div className="sm:text-right">
        <div className="text-3xs font-medium uppercase tracking-wider text-ink-500">
          Current Capital
        </div>
        <div className="tabular mt-0.5 text-lg font-semibold tracking-tight text-ink-900">
          {account ? formatCurrency(currentCapital) : "—"}
        </div>
      </div>
    </div>
  );
}
