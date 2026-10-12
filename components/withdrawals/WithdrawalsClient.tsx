"use client";

import * as React from "react";
import { Building2, User } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals, useRevalidateAccount } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WithdrawalProgress } from "./WithdrawalProgress";
import { EligibilityPanel } from "./EligibilityPanel";
import { WithdrawalFormModal } from "./WithdrawalFormModal";
import { WithdrawalHistory } from "./WithdrawalHistory";
import { cn } from "@/lib/utils";

type Tab = "maven" | "personal";

export function WithdrawalsClient() {
  const { currentAccount, currentAccountId, filterMode, filteredAccounts } =
    useCurrentAccount();

  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const revalidate = useRevalidateAccount(currentAccountId);
  const [formOpen, setFormOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("maven");

  // Auto-pick the tab based on the current account type
  React.useEffect(() => {
    if (currentAccount?.account_type === "PERSONAL") setTab("personal");
    else if (currentAccount?.account_type === "MAVEN") setTab("maven");
  }, [currentAccount?.account_type]);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const mavenWithdrawals = React.useMemo(
    () => withdrawals.filter((w) => w.account_type !== "PERSONAL"),
    [withdrawals]
  );
  const personalWithdrawals = React.useMemo(
    () => withdrawals.filter((w) => w.account_type === "PERSONAL"),
    [withdrawals]
  );

  const mavenCount = filteredAccounts.filter(
    (a) => a.account_type === "MAVEN"
  ).length;
  const personalCount = filteredAccounts.filter(
    (a) => a.account_type === "PERSONAL"
  ).length;

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Withdrawals"
          subtitle="Maven payouts and personal cash withdrawals."
        />
        <EmptyState
          title="No account selected"
          description="Create an account in Settings to view withdrawals."
        />
      </div>
    );
  }

  if (isLoading && trades.length === 0 && withdrawals.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Withdrawals"
          subtitle="Maven payouts and personal cash withdrawals."
        />
        <BlockLoader label="Loading withdrawals" />
      </div>
    );
  }

  const visibleWithdrawals =
    tab === "maven" ? mavenWithdrawals : personalWithdrawals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Withdrawals"
        subtitle={
          tab === "maven"
            ? "Maven payouts requested and received."
            : "Cash withdrawn from your personal broker account."
        }
        actions={
          <Badge tone={tab === "maven" ? "brand" : "profit"}>
            {tab === "maven"
              ? `${mavenCount} Maven account${mavenCount === 1 ? "" : "s"}`
              : `${personalCount} personal account${personalCount === 1 ? "" : "s"}`}
          </Badge>
        }
      />

      <AccountHeader
        account={currentAccount}
        currentCapital={metrics.currentCapital}
      />

      <div className="border-b border-border">
        <nav className="flex items-center gap-1" role="tablist">
          <TabBtn
            active={tab === "maven"}
            onClick={() => setTab("maven")}
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Maven Payouts"
            count={mavenWithdrawals.length}
          />
          <TabBtn
            active={tab === "personal"}
            onClick={() => setTab("personal")}
            icon={<User className="h-3.5 w-3.5" />}
            label="Personal Withdrawals"
            count={personalWithdrawals.length}
          />
        </nav>
      </div>

      {tab === "maven" && (
        <div className="space-y-4">
          <WithdrawalProgress
            metrics={metrics}
            startingCapital={metrics.startingCapital}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WithdrawalHistory
                withdrawals={mavenWithdrawals}
                onDeleted={revalidate}
              />
            </div>
            <div>
              <EligibilityPanel
                metrics={metrics}
                onRecord={() => setFormOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "personal" && (
        <div className="space-y-4">
          <Card>
            <CardBody className="text-2xs text-ink-600">
              Personal withdrawals are cash you take out of your personal broker
              account. They reduce the account's capital but are not trading
              losses. Deposits and withdrawals from your own capital never
              count as trading income.
            </CardBody>
          </Card>
          <WithdrawalHistory
            withdrawals={personalWithdrawals}
            onDeleted={revalidate}
          />
        </div>
      )}

      <WithdrawalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={revalidate}
        account={currentAccount}
        forceType={tab === "personal" ? "PERSONAL" : "MAVEN"}
      />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors",
        active
          ? "border-brand-600 font-medium text-ink-900"
          : "border-transparent text-ink-500 hover:text-ink-800"
      )}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-3xs font-medium",
            active ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}


