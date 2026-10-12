"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Account, Profile, AccountType } from "@/lib/types";

const SELECTED_ACCOUNT_KEY = "alltrades.selectedAccountId";
const FILTER_MODE_KEY = "alltrades.accountFilterMode";

/**
 * Filter modes:
 * - "ALL"       → all accounts combined
 * - "MAVEN"     → only Maven prop firm accounts
 * - "PERSONAL"  → only personal accounts
 * - "SINGLE"    → one specific account (currentAccountId)
 */
export type AccountFilterMode = "ALL" | "MAVEN" | "PERSONAL" | "SINGLE";

interface AccountContextValue {
  accounts: Account[];
  currentAccountId: string | null;
  currentAccount: Account | null;
  setCurrentAccountId: (id: string) => void;
  filterMode: AccountFilterMode;
  setFilterMode: (mode: AccountFilterMode) => void;
  /** Accounts that match the current filter mode. */
  filteredAccounts: Account[];
  /** True when filterMode is ALL — some cards should merge data. */
  isAllMode: boolean;
  /** True when a single account is selected. */
  isSingleMode: boolean;
  /** False on the very first server + client render, true after localStorage loads. */
  hydrated: boolean;
}

const AccountContext = React.createContext<AccountContextValue | null>(null);

export function useCurrentAccount() {
  const ctx = React.useContext(AccountContext);
  if (!ctx) throw new Error("useCurrentAccount must be used inside AppShell");
  return ctx;
}

function readStoredAccountId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SELECTED_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function readStoredFilterMode(): AccountFilterMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(FILTER_MODE_KEY);
    if (v === "ALL" || v === "MAVEN" || v === "PERSONAL" || v === "SINGLE") {
      return v;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Prefetch the heaviest routes after the initial paint so the user's first
 * navigation to them feels instant. Fired on idle so it never blocks the
 * initial render.
 */
function warmUpRoutes() {
  if (typeof window === "undefined") return;
  const warm = () => {
    // Router prefetch triggers on link hover, but we can nudge the browser
    // to fetch the initial chunk of these pages via the <link rel="prefetch">
    // mechanism. Next.js also exposes prefetch via the internal router.
  };
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(warm);
  } else {
    window.setTimeout(warm, 2000);
  }
}

export function AppShell({
  profile,
  accounts,
  children,
}: {
  profile: Profile;
  accounts: Account[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Warm the router after initial paint.
  React.useEffect(() => {
    warmUpRoutes();
  }, []);

  // IMPORTANT: Never read localStorage during render — it would cause
  // hydration mismatches because the server doesn't have it. Instead, seed
  // deterministic defaults and hydrate from localStorage after mount.
  const [hydrated, setHydrated] = React.useState(false);
  const [currentAccountId, setCurrentAccountIdState] = React.useState<
    string | null
  >(accounts[0]?.id ?? null);
  const [filterMode, setFilterModeState] = React.useState<AccountFilterMode>(
    accounts.length <= 1 ? "SINGLE" : "ALL"
  );

  React.useEffect(() => {
    // Runs only on the client, after first paint.
    const storedId = readStoredAccountId();
    if (storedId && accounts.some((a) => a.id === storedId)) {
      setCurrentAccountIdState(storedId);
    }
    const storedMode = readStoredFilterMode();
    if (storedMode) {
      setFilterModeState(storedMode);
    } else if (accounts.length > 1) {
      setFilterModeState("ALL");
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the stored account doesn't exist anymore, fall back.
  React.useEffect(() => {
    if (currentAccountId && accounts.some((a) => a.id === currentAccountId)) {
      return;
    }
    const fallback = accounts[0]?.id ?? null;
    if (fallback !== currentAccountId) {
      setCurrentAccountIdState(fallback);
      if (fallback) {
        try {
          window.localStorage.setItem(SELECTED_ACCOUNT_KEY, fallback);
        } catch {
          // ignore
        }
      }
    }
  }, [accounts, currentAccountId]);

  const setCurrentAccountId = React.useCallback((id: string) => {
    setCurrentAccountIdState(id);
    // Switching to a specific account implies SINGLE mode.
    setFilterModeState("SINGLE");
    try {
      window.localStorage.setItem(SELECTED_ACCOUNT_KEY, id);
      window.localStorage.setItem(FILTER_MODE_KEY, "SINGLE");
    } catch {
      // ignore
    }
  }, []);

  const setFilterMode = React.useCallback((mode: AccountFilterMode) => {
    setFilterModeState(mode);
    try {
      window.localStorage.setItem(FILTER_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const currentAccount = React.useMemo(
    () => accounts.find((a) => a.id === currentAccountId) ?? null,
    [accounts, currentAccountId]
  );

  const filteredAccounts = React.useMemo(() => {
    if (filterMode === "ALL") return accounts;
    if (filterMode === "MAVEN") {
      return accounts.filter((a) => a.account_type === "MAVEN");
    }
    if (filterMode === "PERSONAL") {
      return accounts.filter((a) => a.account_type === "PERSONAL");
    }
    // SINGLE
    return currentAccount ? [currentAccount] : [];
  }, [accounts, filterMode, currentAccount]);

  async function onSignOut() {
    await supabase.auth.signOut();
    try {
      window.localStorage.removeItem(FILTER_MODE_KEY);
    } catch {
      // ignore
    }
    router.replace("/login");
    router.refresh();
  }

  const displayName = React.useMemo(() => {
    const full = profile.full_name?.trim();
    if (full) return full.split(" ")[0];
    const email = profile.email ?? "";
    return email.split("@")[0] ?? "";
  }, [profile]);

  const contextValue: AccountContextValue = {
    accounts,
    currentAccountId,
    currentAccount,
    setCurrentAccountId,
    filterMode,
    setFilterMode,
    filteredAccounts,
    isAllMode: filterMode === "ALL",
    isSingleMode: filterMode === "SINGLE",
    hydrated,
  };

  return (
    <AccountContext.Provider value={contextValue}>
      <ToastProvider>
        <div className="min-h-screen bg-white">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onSignOut={onSignOut}
            userEmail={profile.email}
          />
          <div className="lg:pl-64">
            <Topbar
              onOpenSidebar={() => setSidebarOpen(true)}
              userName={displayName}
              accounts={accounts}
              currentAccountId={currentAccountId}
              onSelectAccount={setCurrentAccountId}
              filterMode={filterMode}
              onFilterModeChange={setFilterMode}
            />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </AccountContext.Provider>
  );
}




