"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteWithdrawal } from "@/lib/data/withdrawals";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import type { Withdrawal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface WithdrawalHistoryProps {
  withdrawals: Withdrawal[];
  onDeleted: () => void;
}

export function WithdrawalHistory({
  withdrawals,
  onDeleted,
}: WithdrawalHistoryProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [pending, setPending] = React.useState<Withdrawal | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const total = withdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0);

  async function confirm() {
    if (!pending) return;
    setDeleting(true);
    try {
      await deleteWithdrawal(supabase, pending.id);
      toast.success("Withdrawal deleted");
      setPending(null);
      onDeleted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete.";
      toast.error("Could not delete withdrawal", msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Withdrawal History</CardTitle>
            <p className="mt-1 text-3xs text-ink-500">
              Total recorded:{" "}
              <span className="tabular font-medium text-ink-700">
                {formatCurrency(total)}
              </span>
            </p>
          </div>
          <Badge tone="neutral">
            {withdrawals.length} {withdrawals.length === 1 ? "entry" : "entries"}
          </Badge>
        </CardHeader>

        <CardBody className="p-0">
          {withdrawals.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No withdrawals recorded"
                description="Once you are eligible, record a withdrawal to see it here."
                compact
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Amount</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Notes</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-surface-soft">
                      <td className="px-4 py-2.5 text-xs text-ink-700">
                        {w.withdrawal_date}
                      </td>
                      <td className="tabular px-4 py-2.5 text-xs font-semibold text-ink-900">
                        {formatCurrency(Number(w.amount))}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={
                            w.status === "Paid" || w.status === "Approved"
                              ? "profit"
                              : w.status === "Pending"
                                ? "warn"
                                : "neutral"
                          }
                        >
                          {w.status}
                        </Badge>
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-2.5 text-xs text-ink-600">
                        {w.notes ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPending(w)}
                          aria-label="Delete withdrawal"
                          className="text-loss-text hover:bg-loss-bg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        title="Delete withdrawal?"
        description={
          pending
            ? `This will remove the ${formatCurrency(Number(pending.amount))} withdrawal and restore the current capital accordingly.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </>
  );
}
