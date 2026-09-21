"use client";

import { Plus } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { AccountForm } from "./AccountForm";
import { AccountList } from "./AccountList";
import { SystemRulesCard } from "./SystemRulesCard";
import { DeleteAccountCard } from "./DeleteAccountCard";

export function SettingsClient() {
  const { accounts, currentAccount } = useCurrentAccount();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Create accounts and manage your trading accounts."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                {accounts.length}{" "}
                {accounts.length === 1 ? "account" : "accounts"}
              </span>
            </CardHeader>
            <CardBody>
              <AccountList accounts={accounts} />
            </CardBody>
          </Card>

          <DeleteAccountCard />
        </div>

        <div className="space-y-6">
          <SystemRulesCard account={currentAccount} />

          <Card>
            <CardHeader>
              <CardTitle>Market Conditions</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-2xs leading-relaxed text-ink-600">
                Market conditions apply, including spread and slippage.
                ALLTRADES does not control or represent broker execution
                conditions and does not connect to any broker account. Every
                metric shown in the application is derived from the trades,
                analyses and withdrawals you record here.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
