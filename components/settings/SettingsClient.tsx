"use client";

import { Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { AccountForm } from "./AccountForm";
import { AccountList } from "./AccountList";
import { DeleteAccountCard } from "./DeleteAccountCard";
import { AccountingSettingsCard } from "./AccountingSettingsCard";
import { AccountTypeCard } from "./AccountTypeCard";
import { PersonalTradingPlanEditor } from "./PersonalTradingPlanEditor";
import { AccountRulesEditor } from "./AccountRulesEditor";

export function SettingsClient() {
  const { accounts } = useCurrentAccount();
  const hasPersonalAccounts = accounts.some((account) => account.account_type === "PERSONAL");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your accounts, configure trading rules, and personalize your trading workspace."
      />

      <AccountTypeCard
        accounts={accounts}
        onClassified={() => window.location.reload()}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {hasPersonalAccounts && <PersonalTradingPlanEditor accounts={accounts} />}

          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <Plus className="h-4 w-4 text-ink-400" />
            </CardHeader>
            <CardBody>
              <AccountForm />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Accounts</CardTitle>
              <span className="text-2xs text-ink-500">
                {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
              </span>
            </CardHeader>
            <CardBody>
              <AccountList accounts={accounts} />
            </CardBody>
          </Card>

          <AccountingSettingsCard />
          <DeleteAccountCard />
        </div>

        <div className="space-y-6">
          <AccountRulesEditor />

          <Card>
            <CardHeader>
              <CardTitle>Market Conditions</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-2xs leading-relaxed text-ink-600">
                Spread, slippage, liquidity and broker execution can affect
                results. ALLTRADES does not connect to a broker or control
                execution. Metrics are calculated from the trades, analyses
                and withdrawals you record.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
