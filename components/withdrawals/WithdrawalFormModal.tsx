"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createWithdrawal } from "@/lib/data/withdrawals";
import { WITHDRAWAL_STATUSES } from "@/lib/constants";
import type { Account } from "@/lib/types";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface WithdrawalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: Account;
}

export function WithdrawalFormModal({
  open,
  onClose,
  onSaved,
  account,
}: WithdrawalFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [amount, setAmount] = React.useState("");
  const [status, setStatus] = React.useState("Recorded");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setDate(toDateKey(new Date()));
    setAmount("");
    setStatus("Recorded");
    setNotes("");
    setErrors({});
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!date) next.date = "Date is required.";
    const amt = parseNumberOrNull(amount);
    if (amt === null || amt <= 0) next.amount = "Amount must be greater than zero.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      await createWithdrawal(supabase, user.id, {
        account_id: account.id,
        withdrawal_date: date,
        amount: amt as number,
        status: status as "Recorded" | "Pending" | "Approved" | "Paid",
        notes: notes.trim() ? notes.trim() : null,
      });
      toast.success("Withdrawal recorded");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record withdrawal.";
      toast.error("Could not record withdrawal", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Withdrawal"
      description="Record a withdrawal from this account. It will reduce the current capital automatically."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            Record withdrawal
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor="wd_date" required error={errors.date}>
            <Input
              id="wd_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              invalid={!!errors.date}
            />
          </Field>
          <Field label="Amount" htmlFor="wd_amount" required error={errors.amount}>
            <Input
              id="wd_amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              prefix="$"
              invalid={!!errors.amount}
              placeholder="200.00"
            />
          </Field>
        </div>

        <Field label="Status" htmlFor="wd_status">
          <Select
            id="wd_status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={WITHDRAWAL_STATUSES as unknown as string[]}
          />
        </Field>

        <Field label="Notes" htmlFor="wd_notes">
          <Textarea
            id="wd_notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </form>
    </Modal>
  );
}
