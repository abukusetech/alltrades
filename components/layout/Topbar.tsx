"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { AccountSwitcher } from "./AccountSwitcher";
import { cn, formatDateLong, greetingFor } from "@/lib/utils";
import type { Account } from "@/lib/types";

export interface TopbarProps {
  onOpenSidebar: () => void;
  userName: string;
  accounts: Account[];
  currentAccountId: string | null;
  onSelectAccount: (id: string) => void;
  className?: string;
}

export function Topbar({
  onOpenSidebar,
  userName,
  accounts,
  currentAccountId,
  onSelectAccount,
  className,
}: TopbarProps) {
  // Compute greeting on the client only, to avoid SSR/CSR mismatch
  const [greeting, setGreeting] = React.useState<string>("Welcome");
  const [dateLabel, setDateLabel] = React.useState<string>("");

  React.useEffect(() => {
    const now = new Date();
    setGreeting(greetingFor(now));
    setDateLabel(formatDateLong(now));
  }, []);

  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border bg-white px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-900">
            {greeting}
            {userName ? `, ${userName}` : ""}.
          </div>
          <div className="text-3xs text-ink-500">{dateLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AccountSwitcher
          accounts={accounts}
          currentAccountId={currentAccountId}
          onSelect={onSelectAccount}
        />
      </div>
    </header>
  );
}
