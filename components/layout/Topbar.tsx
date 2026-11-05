"use client";

import * as React from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { AccountSwitcher } from "./AccountSwitcher";
import { cn, formatDateLong, greetingFor } from "@/lib/utils";
import type { Account } from "@/lib/types";

import type { AccountFilterMode } from "./AppShell";

export interface TopbarProps {
  onOpenSidebar: () => void;
  onToggleSidebar?: () => void;
  userName: string;
  accounts: Account[];
  currentAccountId: string | null;
  onSelectAccount: (id: string) => void;
  filterMode: AccountFilterMode;
  onFilterModeChange: (mode: AccountFilterMode) => void;
  className?: string;
}

export function Topbar({
  onOpenSidebar,
  onToggleSidebar,
  userName,
  accounts,
  currentAccountId,
  onSelectAccount,
  filterMode,
  onFilterModeChange,
  className,
}: TopbarProps) {
  // Compute greeting on the client only, to avoid SSR/CSR mismatch
  const [greeting, setGreeting] = React.useState<string>("Welcome");
  const [dateLabel, setDateLabel] = React.useState<string>("");
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted dark:text-ink-300 dark:hover:bg-ink-800"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        
        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted dark:text-ink-300 dark:hover:bg-ink-800"
          aria-label="Toggle navigation"
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
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded border border-border-strong text-ink-700 hover:bg-surface-muted dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
        <AccountSwitcher
          accounts={accounts}
          currentAccountId={currentAccountId}
          onSelect={onSelectAccount}
          filterMode={filterMode}
          onFilterModeChange={onFilterModeChange}
        />
      </div>
    </header>
  );
}



