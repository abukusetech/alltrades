"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { deleteTransaction } from "@/lib/accounting/data";
import { createClient } from "@/lib/supabase/client";
import type { AccountingTransaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const CONFIRM_PHRASE = "DELETE";

export interface DeleteTransactionModalProps {
  transaction: AccountingTransaction | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteTransactionModal({
  transaction,
  open,
  onClose,
  onDeleted,
}: DeleteTransactionModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [confirmation, setConfirmation] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setConfirmation("");
      setError(null);
    }
  }, [open]);

  async function onConfirm() {
    if (!transaction) return;
    if (confirmation.trim() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      await deleteTransaction(supabase, user.id, transaction.id);
      toast.success("Transaction deleted");
      onDeleted();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not delete transaction.";
      setError(msg);
      toast.error("Delete failed", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!transaction) return null;

  const isReplacement = !!transaction.reverses && transaction.kind !== "correction";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReplacement ? "Delete this correction?" : "Delete this transaction?"}
      description={
        isReplacement
          ? "Removes the correction AND its reversal, restoring the original entry."
          : "Removes the transaction and its ledger entries permanently."
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={saving}
            disabled={confirmation.trim() !== CONFIRM_PHRASE}
          >
            Delete permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">This cannot be undone.</div>
            <p className="mt-0.5 opacity-90">
              {isReplacement
                ? "The original entry that you corrected will become active again as if the edit never happened."
                : "Both the transaction and its double-entry ledger postings will be removed."}
            </p>
          </div>
        </div>

        <div className="rounded border border-border bg-surface-soft p-3 text-2xs">
          <div className="font-medium text-ink-900">
            {transaction.description}
          </div>
          <div className="mt-1 text-ink-600">
            {transaction.occurred_on} · {transaction.kind} ·{" "}
            <span className="tabular font-medium text-ink-900">
              {formatCurrency(Number(transaction.amount_usd))}
            </span>
          </div>
        </div>

        <Field
          label={`Type "${CONFIRM_PHRASE}" to confirm`}
          htmlFor="confirm_delete"
          error={error ?? undefined}
        >
          <Input
            id="confirm_delete"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            disabled={saving}
            invalid={!!error}
          />
        </Field>
      </div>
    </Modal>
  );
}
