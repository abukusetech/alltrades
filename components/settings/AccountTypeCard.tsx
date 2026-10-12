"use client";

import * as React from "react";
import { AlertTriangle, Building2, User } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Account, AccountType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/**
 * Shown when one or more accounts are still UNCLASSIFIED.
 * The user must explicitly pick Maven or Personal for each.
 * We never guess.
 */
export function AccountTypeCard({
  accounts,
  onClassified,
}: {
  accounts: Account[];
  onClassified: () => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const unclassified = accounts.filter(
    (a) => a.account_type === "UNCLASSIFIED"
  );

  if (unclassified.length === 0) return null;

  async function classify(account: Account, type: AccountType) {
    setBusyId(account.id);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ account_type: type })
        .eq("id", account.id);
      if (error) throw error;

      // Propagate to trades so denormalized filtering stays correct.
      await supabase
        .from("trades")
        .update({ account_type: type })
        .eq("account_id", account.id);

      toast.success(
        "Account classified",
        `${account.name} → ${type === "MAVEN" ? "Maven Prop Firm" : "Personal Capital"}`
      );
      onClassified();
    } catch (err) {
      toast.error(
        "Classification failed",
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warn-text" />
          <CardTitle>Classify your accounts</CardTitle>
        </div>
        <Badge tone="warn">{unclassified.length} unclassified</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-2xs text-ink-600">
          We don&apos;t guess account types. Please tell us which of these are
          Maven prop firm accounts and which are funded by your own capital.
          Your choice determines which rules, dashboards, and analytics apply.
        </p>

        <div className="space-y-3">
          {unclassified.map((a) => (
            <div
              key={a.id}
              className="rounded border border-border bg-surface-soft p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-ink-900">
                    {a.name}
                  </div>
                  <div className="mt-0.5 text-3xs text-ink-500">
                    Starting capital {formatCurrency(Number(a.starting_capital))}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => classify(a, "MAVEN")}
                    loading={busyId === a.id}
                    leftIcon={<Building2 className="h-3.5 w-3.5" />}
                  >
                    Maven Prop Firm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => classify(a, "PERSONAL")}
                    loading={busyId === a.id}
                    leftIcon={<User className="h-3.5 w-3.5" />}
                  >
                    Personal Capital
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
