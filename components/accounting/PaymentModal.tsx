"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { markWithdrawalPaid } from "@/lib/accounting/withdrawals";
import type { AccountingWithdrawal } from "@/lib/types";
import { formatCurrency, toDateKey } from "@/lib/utils";

export interface PaymentModalProps {
  withdrawal: AccountingWithdrawal | null;
  open: boolean;
  onClose: () => void;
  onPaid: (withdrawal: AccountingWithdrawal, netReceived: number) => void;
}

export function PaymentModal({
  withdrawal,
  open,
  onClose,
  onPaid,
}: PaymentModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !withdrawal) return;
    setAmount(String(withdrawal.expected_net_payout ?? withdrawal.gross_requested ?? ""));
    setDate(toDateKey(new Date()));
  }, [open, withdrawal]);

  async function onConfirm() {
    if (!withdrawal) return;
    const net = Number(amount);
    if (!Number.isFinite(net) || net <= 0) {
      toast.error("Invalid amount", "Enter the actual net received.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      const updated = await markWithdrawalPaid(
        supabase,
        user.id,
        withdrawal.id,
        net,
        date
      );
      toast.success("Marked as paid");
      onPaid(updated, net);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not mark as paid.";
      toast.error("Failed to update", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!withdrawal) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      description="Confirm the actual net amount you received. Next step will ask how to allocate it."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={saving}>
            Mark as paid
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded border border-border bg-surface-soft p-3 text-2xs">
          <div className="flex justify-between">
            <span className="text-ink-600">Gross requested</span>
            <span className="tabular font-medium text-ink-900">
              {formatCurrency(Number(withdrawal.gross_requested))}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-ink-600">Expected net</span>
            <span className="tabular font-medium text-ink-900">
              {withdrawal.expected_net_payout !== null
                ? formatCurrency(Number(withdrawal.expected_net_payout))
                : "—"}
            </span>
          </div>
        </div>

        <Field label="Actual net received" htmlFor="net" required>
          <Input
            id="net"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            prefix="$"
          />
        </Field>

        <Field label="Received date" htmlFor="recd" required>
          <Input
            id="recd"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
