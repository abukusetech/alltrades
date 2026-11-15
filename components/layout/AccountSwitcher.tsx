"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Plus,
  Check,
  Building2,
  User,
  Layers,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { accountTypeLabel, accountTypeTone } from "@/lib/accounts/rules";
import { Badge } from "@/components/ui/Badge";
import type { Account } from "@/lib/types";
import type { AccountFilterMode } from "./AppShell";

export interface AccountSwitcherProps {
  accounts: Account[];
  currentAccountId: string | null;
  onSelect: (id: string) => void;
  filterMode: AccountFilterMode;
  onFilterModeChange: (mode: AccountFilterMode) => void;
  className?: string;
}

export function AccountSwitcher({
  accounts,
  currentAccountId,
  onSelect,
  filterMode,
  onFilterModeChange,
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

  // What does the topbar button say?
  const label =
    filterMode === "ALL"
      ? "All Accounts"
      : filterMode === "MAVEN"
        ? "Prop Firm Accounts"
        : filterMode === "PERSONAL"
          ? "Personal Capital"
          : current?.name ?? "Select account";

  const propFirmCount = accounts.filter((a) => a.account_type === "MAVEN").length;
  const personalCount = accounts.filter((a) => a.account_type === "PERSONAL").length;

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
        {/* Icon depends on filterMode, which is client-only. To avoid
            hydration mismatch, only render the icon once mounted. */}
        <SwitcherIcon filterMode={filterMode} />
        <span className="font-medium text-ink-900">{label}</span>
        {filterMode === "SINGLE" && current && (
          <span className="tabular text-ink-500">
            {formatCurrency(Number(current.starting_capital))}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-white shadow-raised"
        >
          {/* Mode group */}
          <div className="border-b border-border px-3 py-2 text-3xs font-medium uppercase tracking-wide text-ink-500">
            View
          </div>
          <ul className="py-1">
            <ModeItem
              active={filterMode === "ALL"}
              icon={<Layers className="h-3.5 w-3.5 text-ink-500" />}
              label="All Accounts"
              hint={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
              onClick={() => {
                onFilterModeChange("ALL");
                setOpen(false);
              }}
            />
            {propFirmCount > 0 && (
              <ModeItem
                active={filterMode === "MAVEN"}
                icon={<Building2 className="h-3.5 w-3.5 text-brand-600" />}
                label="Prop Firm Accounts"
                hint={`${propFirmCount} account${propFirmCount === 1 ? "" : "s"}`}
                onClick={() => {
                  onFilterModeChange("MAVEN");
                  setOpen(false);
                }}
              />
            )}
            {personalCount > 0 && (
              <ModeItem
                active={filterMode === "PERSONAL"}
                icon={<User className="h-3.5 w-3.5 text-profit-text" />}
                label="Personal Capital"
                hint={`${personalCount} account${personalCount === 1 ? "" : "s"}`}
                onClick={() => {
                  onFilterModeChange("PERSONAL");
                  setOpen(false);
                }}
              />
            )}
          </ul>

          {/* Individual accounts */}
          <div className="border-t border-border px-3 py-2 text-3xs font-medium uppercase tracking-wide text-ink-500">
            Specific Account
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {accounts.map((a) => {
              const isActive =
                filterMode === "SINGLE" && a.id === currentAccountId;
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
                      isActive
                        ? "bg-brand-50 text-ink-900"
                        : "text-ink-700 hover:bg-surface-muted"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{a.name}</span>
                        <Badge tone={accountTypeTone(a.account_type)}>
                          {accountTypeLabel(a.account_type)}
                        </Badge>
                      </div>
                      <div className="tabular mt-0.5 text-3xs text-ink-500">
                        {formatCurrency(Number(a.starting_capital))} starting
                      </div>
                    </div>
                    {isActive && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    )}
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
              Manage accounts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeItem({
  active,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors",
          active
            ? "bg-brand-50 text-ink-900"
            : "text-ink-700 hover:bg-surface-muted"
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xs text-ink-500">{hint}</span>
          {active && <Check className="h-3.5 w-3.5 text-brand-600" />}
        </div>
      </button>
    </li>
  );
}


/**
 * Client-only icon. Returns an empty span on the server render so the
 * initial HTML matches the client hydration, then renders the icon
 * after mount via a useEffect.
 */
function SwitcherIcon({ filterMode }: { filterMode: AccountFilterMode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="block h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (filterMode === "MAVEN") {
    return <Building2 className="h-3.5 w-3.5 text-brand-600" />;
  }
  if (filterMode === "PERSONAL") {
    return <User className="h-3.5 w-3.5 text-profit-text" />;
  }
  if (filterMode === "ALL") {
    return <Layers className="h-3.5 w-3.5 text-ink-500" />;
  }
  return <span className="block h-3.5 w-3.5" aria-hidden="true" />;
}
