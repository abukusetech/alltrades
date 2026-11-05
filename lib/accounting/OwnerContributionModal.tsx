"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { postOwnerContribution } from "@/lib/accounting/ledger";
import { createClient } from "@/lib/supabase/client";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface OwnerContributionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function OwnerContributionModal({ open, onClose, onSaved }: OwnerContributionModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);

  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [amount, setAmount] = React.useState("");
  const [sourceFund, setSourceFund] = React.useState("personal_savings");
  const [destFund, setDestFund] = React.useState("business_cash");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Reset state when opened
  React.useEffect(() => {
    if (open) {
      setDate(toDateKey(new Date()));
      setAmount("");
      setSourceFund("personal_savings");
      setDestFund("business_cash");
      setDescription("");
      setNotes("");
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseNumberOrNull(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!description.trim()) return toast.error("Description is required");

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      await postOwnerContribution(supabase, user.id, {
        occurred_on: date,
        amount: amt,
        description: description.trim(),
        source_fund: sourceFund as any,
        dest_fund: destFund as any,
        notes: notes.trim() || null,
      });

      toast.success("Owner contribution recorded");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to record", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Owner Contribution"
      description="Record personal money entering the business."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} loading={saving}>Record</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" htmlFor="oc_date" required>
            <Input id="oc_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Amount" htmlFor="oc_amount" required>
            <Input id="oc_amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} prefix="$" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Source (Personal)" htmlFor="oc_source">
            <Select
              id="oc_source"
              value={sourceFund}
              onChange={(e) => setSourceFund(e.target.value)}
              options={[
                { value: "personal_savings", label: "Personal Savings" },
                { value: "personal_spending", label: "Personal Spending" },
                { value: "personal_broker_cash", label: "Personal Broker Cash" },
              ]}
            />
          </Field>
          <Field label="Destination" htmlFor="oc_dest">
            <Select
              id="oc_dest"
              value={destFund}
              onChange={(e) => setDestFund(e.target.value)}
              options={[
                { value: "business_cash", label: "Business Cash" },
                { value: "business_expenses", label: "Direct Business Expense" },
              ]}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="oc_desc" required>
          <Input id="oc_desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Initial funding for Maven account" />
        </Field>

        <Field label="Notes" htmlFor="oc_notes">
          <Textarea id="oc_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="rounded border border-border bg-surface-soft px-3 py-2 text-3xs text-ink-500">
          Debit: <strong className="text-ink-800">{destFund}</strong> | Credit: <strong className="text-ink-800">owner_capital</strong>
        </div>
      </form>
    </Modal>
  );
}
