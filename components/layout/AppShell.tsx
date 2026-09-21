"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Account, Profile } from "@/lib/types";

const SELECTED_ACCOUNT_KEY = "alltrades.selectedAccountId";

interface AccountContextValue {
  accounts: Account[];
  currentAccountId: string | null;
  currentAccount: Account | null;
  setCurrentAccountId: (id: string) => void;
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

  // Initialize SYNCHRONOUSLY from localStorage so the first render already
  // has the right account — no wasted SWR fetch of null.
  const [currentAccountId, setCurrentAccountIdState] = React.useState<
    string | null
  >(() => {
    const stored = readStoredAccountId();
    if (stored && accounts.some((a) => a.id === stored)) return stored;
    return accounts[0]?.id ?? null;
  });

  // If the initially-chosen account isn't valid anymore, reconcile once.
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
    try {
      window.localStorage.setItem(SELECTED_ACCOUNT_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const currentAccount = React.useMemo(
    () => accounts.find((a) => a.id === currentAccountId) ?? null,
    [accounts, currentAccountId]
  );

  async function onSignOut() {
    await supabase.auth.signOut();
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
