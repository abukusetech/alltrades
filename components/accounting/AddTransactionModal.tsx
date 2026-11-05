"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { postTransaction, postTransfer } from "@/lib/accounting/ledger";
import { createClient } from "@/lib/supabase/client";
import type { AccountingFund, AccountingTransactionKind } from "@/lib/types";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

type Mode = "transfer" | "income" | "expense";

const KIND_BY_MODE: Record<Mode, AccountingTransactionKind> = {
  transfer: "transfer",
  income: "income",
  expense: "expense",
};

export interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  funds: AccountingFund[];
}

export function AddTransactionModal({
  open,
  onClose,
  onSaved,
  funds,
}: AddTransactionModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [mode, setMode] = React.useState<Mode>("transfer");
  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [rate, setRate] = React.useState("1");
  const [fromFund, setFromFund] = React.useState<string>("business_cash");
  const [toFund, setToFund] = React.useState<string>("account_fund");
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setMode("transfer");
    setDate(toDateKey(new Date()));
    setAmount("");
    setCurrency("USD");
    setRate("1");
    setFromFund("business_cash");
    setToFund("account_fund");
    setDescription("");
    setReference("");
    setNotes("");
    setErrors({});
  }, [open]);

  const fundOptions = funds.map((f) => ({ value: f.key, label: f.label }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    const amt = parseNumberOrNull(amount);
    if (!date) next.date = "Date is required.";
    if (amt === null || amt <= 0) next.amount = "Amount must be greater than zero.";
    if (mode !== "transfer" && !description.trim()) next.description = "Description is required.";
    if (mode === "transfer") {
      if (fromFund === toFund) next.toFund = "Funds must differ.";
      if (!description.trim()) next.description = "Description is required.";
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

      const amt = parseNumberOrNull(amount) as number;
      const r = parseNumberOrNull(rate) ?? 1;

      if (mode === "transfer") {
        await postTransfer(supabase, user.id, {
          occurred_on: date,
          amount: amt,
          from_fund: fromFund as never,
          to_fund: toFund as never,
          description: description.trim(),
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        });
      } else if (mode === "income") {
        await postTransaction(
          supabase,
          user.id,
          {
            occurred_on: date,
            kind: KIND_BY_MODE[mode],
            description: description.trim(),
            amount: amt,
            currency,
            exchange_rate_to_usd: r,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
          },
          [
            { fund_key: toFund as never, direction: "debit", amount: amt },
            { fund_key: fromFund as never, direction: "credit", amount: amt },
          ]
        );
      } else {
        // expense
        await postTransaction(
          supabase,
          user.id,
          {
            occurred_on: date,
            kind: KIND_BY_MODE[mode],
            description: description.trim(),
            amount: amt,
            currency,
            exchange_rate_to_usd: r,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
          },
          [
            { fund_key: toFund as never, direction: "debit", amount: amt },
            { fund_key: fromFund as never, direction: "credit", amount: amt },
          ]
        );
      }

      toast.success("Transaction posted");
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not post transaction.";
      toast.error("Failed to post", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Transaction"
      description="Post a double-entry event. Debits and credits must balance."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            Post transaction
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Transaction type" htmlFor="mode">
          <Select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            options={[
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
              { value: "transfer", label: "Transfer between funds" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date" htmlFor="date" required error={errors.date}>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              invalid={!!errors.date}
            />
          </Field>
          <Field label="Amount" htmlFor="amount" required error={errors.amount}>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              invalid={!!errors.amount}
              prefix="$"
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
        </div>

        {currency !== "USD" && (
          <Field
            label={`Exchange rate — 1 ${currency} in USD`}
            htmlFor="rate"
            hint="Stored with the transaction so historical reports don't drift."
          >
            <Input
              id="rate"
              type="number"
              step="0.00000001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Debit fund (money in)" htmlFor="to_fund">
            <Select
              id="to_fund"
              value={toFund}
              onChange={(e) => setToFund(e.target.value)}
              options={fundOptions}
            />
          </Field>
          <Field label="Credit fund (money out)" htmlFor="from_fund" error={errors.toFund}>
            <Select
              id="from_fund"
              value={fromFund}
              onChange={(e) => setFromFund(e.target.value)}
              options={fundOptions}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="description" required error={errors.description}>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Maven withdrawal received"
            invalid={!!errors.description}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Reference" htmlFor="reference">
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="rounded border border-border bg-surface-soft px-3 py-2 text-3xs text-ink-500">
          Double-entry preview: <strong className="text-ink-800">{toFund}</strong> will be
          debited, <strong className="text-ink-800">{fromFund}</strong> will be credited.
          Both legs must sum to the same amount.
        </div>
      </form>
    </Modal>
  );
}

