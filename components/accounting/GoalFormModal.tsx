"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { createGoal, updateGoal, getSettings } from "@/lib/accounting/data";
import type { AccountingGoal, AccountingFundKey, AccountingSettings } from "@/lib/types";
import { parseNumberOrNull } from "@/lib/utils";

const FUND_OPTIONS: { value: AccountingFundKey; label: string }[] = [
  { value: "account_fund", label: "Account Fund" },
  { value: "personal_savings", label: "Personal Savings" },
  { value: "emergency_fund", label: "Emergency Fund" },
  { value: "business_operating", label: "Business Operating" },
  { value: "personal_spending", label: "Personal Spending" },
];

export interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: AccountingGoal | null;
}

export function GoalFormModal({
  open,
  onClose,
  onSaved,
  editing,
}: GoalFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const isEdit = !!editing;

  const [name, setName] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [rate, setRate] = React.useState("1");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [linkedFund, setLinkedFund] = React.useState<AccountingFundKey>("personal_savings");
  const [targetDate, setTargetDate] = React.useState("");
  const [priority, setPriority] = React.useState("2");
  const [notes, setNotes] = React.useState("");
  const [settings, setSettings] = React.useState<AccountingSettings | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const s = await getSettings(supabase, user.id);
      setSettings(s);
    })();
    if (editing) {
      setName(editing.name);
      setCurrency(editing.currency);
      setRate(String(editing.exchange_rate_to_usd));
      setTargetAmount(String(editing.target_amount));
      setLinkedFund(editing.linked_fund_key);
      setTargetDate(editing.target_date ?? "");
      setPriority(String(editing.priority));
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setCurrency("USD");
      setRate("1");
      setTargetAmount("");
      setLinkedFund("personal_savings");
      setTargetDate("");
      setPriority("2");
      setNotes("");
    }
    setErrors({});
  }, [open, editing, supabase]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    const amt = parseNumberOrNull(targetAmount);
    if (amt === null || amt <= 0) next.targetAmount = "Target must be greater than zero.";
    if (currency !== "USD") {
      const r = parseNumberOrNull(rate);
      if (r === null || r <= 0) next.rate = "Rate must be greater than zero.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }

      const amt = parseNumberOrNull(targetAmount) as number;
      const r = parseNumberOrNull(rate) ?? 1;
      const amtUsd = currency === "USD" ? amt : Number((amt * r).toFixed(2));

      const payload = {
        name: name.trim(),
        target_amount: amt,
        currency,
        exchange_rate_to_usd: currency === "USD" ? 1 : r,
        target_amount_usd: amtUsd,
        linked_fund_key: linkedFund,
        target_date: targetDate || null,
        priority: Number(priority),
        status: "active" as const,
        notes: notes.trim() || null,
      };

      if (isEdit && editing) {
        await updateGoal(supabase, user.id, editing.id, payload);
        toast.success("Goal updated");
      } else {
        await createGoal(supabase, user.id, payload);
        toast.success("Goal created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        "Failed to save",
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Goal" : "New Savings Goal"}
      description="Goals track progress toward a target. Progress comes from the linked fund's live balance."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Create goal"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Goal name" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Next prop firm account"
            invalid={!!errors.name}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Target amount" htmlFor="target" required error={errors.targetAmount}>
            <Input
              id="target"
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              invalid={!!errors.targetAmount}
            />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <Select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={["USD", "KES"]}
            />
          </Field>
          {currency !== "USD" && (
            <Field
              label={`1 ${currency} in USD`}
              htmlFor="rate"
              error={errors.rate}
            >
              <Input
                id="rate"
                type="number"
                step="0.00000001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                invalid={!!errors.rate}
              />
            </Field>
          )}
        </div>

        <Field label="Linked fund" htmlFor="fund" hint="Progress updates from this fund's balance.">
          <Select
            id="fund"
            value={linkedFund}
            onChange={(e) => setLinkedFund(e.target.value as AccountingFundKey)}
            options={FUND_OPTIONS}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Target date" htmlFor="date">
            <Input
              id="date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </Field>
          <Field label="Priority" htmlFor="priority">
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "1", label: "High" },
                { value: "2", label: "Normal" },
                { value: "3", label: "Low" },
              ]}
            />
          </Field>
        </div>

        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
