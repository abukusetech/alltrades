"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteAccount } from "@/lib/data/accounts";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useCurrentAccount } from "@/components/layout/AppShell";
import type { Account } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export interface AccountListProps {
  accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();
  const { currentAccountId, setCurrentAccountId } = useCurrentAccount();

  const [pendingDelete, setPendingDelete] = React.useState<Account | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAccount(supabase, pendingDelete.id);
      toast.success("Account deleted", pendingDelete.name);
      setPendingDelete(null);
      // If the deleted account was selected, the shell will fall back on refresh
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account.";
      toast.error("Could not delete account", message);
    } finally {
      setDeleting(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardBody className="py-8 text-center">
          <p className="text-sm font-medium text-ink-900">No accounts yet</p>
          <p className="mt-1 text-2xs text-ink-500">
            Create your first trading account using the form.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {accounts.map((a) => {
          const active = a.id === currentAccountId;
          return (
            <Card key={a.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink-900">
                      {a.name}
                    </h3>
                    {active ? (
                      <Badge tone="brand">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-3xs text-ink-500">
                    Starting{" "}
                    <span className="tabular text-ink-700">
                      {formatCurrency(Number(a.starting_capital))}
                    </span>
                    {" · "}
                    {a.max_weekly_trades}/wk
                    {" · "}
                    {formatPercent(Number(a.withdrawal_target_percent), 0)} target
                    {" · "}
                    ≤ {formatPercent(Number(a.max_consistency_percent), 0)} consistency
                  </div>
                  {a.notes && (
                    <p className="mt-1.5 text-2xs text-ink-600">{a.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!active && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                      onClick={() => setCurrentAccountId(a.id)}
                    >
                      Use account
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingDelete(a)}
                    aria-label={`Delete ${a.name}`}
                    className="text-loss-text hover:bg-loss-bg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete account?"
        description={
          pendingDelete
            ? `This will permanently delete "${pendingDelete.name}" and all of its trades, analyses, withdrawals and reviews.`
            : undefined
        }
        confirmLabel="Delete account"
        destructive
        loading={deleting}
      />
    </>
  );
}
