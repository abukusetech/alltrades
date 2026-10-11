"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { reverseTransaction } from "@/lib/accounting/ledger";
import { createClient } from "@/lib/supabase/client";
import type { AccountingTransaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface ReverseTransactionModalProps {
  transaction: AccountingTransaction | null;
  open: boolean;
  onClose: () => void;
  onReversed: () => void;
}

export function ReverseTransactionModal({
  transaction,
  open,
  onClose,
  onReversed,
}: ReverseTransactionModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  async function onConfirm() {
    if (!transaction) return;
    if (!reason.trim()) {
      toast.error("Reason is required");
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
      await reverseTransaction(supabase, user.id, transaction.id, reason.trim());
      toast.success("Reversal posted");
      onReversed();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not reverse.";
      toast.error("Failed to reverse", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!transaction) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reverse this transaction?"
      description="The original stays in the ledger. A linked correction will offset it."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={saving}>
            Post reversal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded border border-border bg-surface-soft p-3 text-2xs">
          <div className="font-medium text-ink-900">{transaction.description}</div>
          <div className="mt-1 text-ink-600">
            {transaction.occurred_on} · {transaction.kind} ·{" "}
            <span className="tabular font-medium text-ink-900">
              {formatCurrency(Number(transaction.amount_usd))}
            </span>
          </div>
        </div>

        <Field label="Reason for reversal" htmlFor="reason" required>
          <Textarea
            id="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate entry — corrected"
          />
        </Field>
      </div>
    </Modal>
  );
}
