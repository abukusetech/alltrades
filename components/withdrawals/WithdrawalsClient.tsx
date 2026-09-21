"use client";

import * as React from "react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals, useRevalidateAccount } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { WithdrawalProgress } from "./WithdrawalProgress";
import { EligibilityPanel } from "./EligibilityPanel";
import { WithdrawalFormModal } from "./WithdrawalFormModal";
import { WithdrawalHistory } from "./WithdrawalHistory";

export function WithdrawalsClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const revalidate = useRevalidateAccount(currentAccountId);
  const [formOpen, setFormOpen] = React.useState(false);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Withdrawals" subtitle="Your 4% target and withdrawal progress are calculated automatically from your trading data." />

      {!currentAccount ? (
        <EmptyState title="No account selected" description="Create an account in Settings to view withdrawals." />
      ) : isLoading && trades.length === 0 && withdrawals.length === 0 ? (
        <BlockLoader label="Loading withdrawals" />
      ) : (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
          <WithdrawalProgress metrics={metrics} startingCapital={metrics.startingCapital} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WithdrawalHistory withdrawals={withdrawals} onDeleted={revalidate} />
            </div>
            <div>
              <EligibilityPanel metrics={metrics} onRecord={() => setFormOpen(true)} />
            </div>
          </div>
          <WithdrawalFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={revalidate} account={currentAccount} />
        </>
      )}
    </div>
  );
}
