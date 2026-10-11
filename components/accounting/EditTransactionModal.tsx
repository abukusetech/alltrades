"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  amendTransaction,
  postTransaction,
  postTransfer,
} from "@/lib/accounting/ledger";
import { createClient } from "@/lib/supabase/client";
import type {
  AccountingFund,
  AccountingLedgerEntry,
  AccountingTransaction,
  AccountingTransactionKind,
} from "@/lib/types";
import { parseNumberOrNull } from "@/lib/utils";

type Mode = "transfer" | "income" | "expense";

function modeFromKind(kind: AccountingTransactionKind): Mode {
  if (kind === "transfer") return "transfer";
  if (kind === "expense" || kind === "account_purchase") return "expense";
  return "income";
}

const KIND_BY_MODE: Record<Mode, AccountingTransactionKind> = {
  transfer: "transfer",
  income: "income",
  expense: "expense",
};

export interface EditTransactionModalProps {
  transaction: AccountingTransaction | null;
  postings: AccountingLedgerEntry[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  funds: AccountingFund[];
}

export function EditTransactionModal({
  transaction,
  postings,
  open,
  onClose,
  onSaved,
  funds,
}: EditTransactionModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [mode, setMode] = React.useState<Mode>("income");
  const [date, setDate] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [rate, setRate] = React.useState("1");
  const [fromFund, setFromFund] = React.useState<string>("trading_income");
  const [toFund, setToFund] = React.useState<string>("business_cash");
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Load existing values into the form when the modal opens
  React.useEffect(() => {
    if (!open || !transaction) return;

    setMode(modeFromKind(transaction.kind));
    setDate(transaction.occurred_on);
    setAmount(String(transaction.amount));
    setCurrency(transaction.currency ?? "USD");
    setRate(String(transaction.exchange_rate_to_usd ?? 1));
    setDescription(transaction.description ?? "");
    setReference(transaction.reference ?? "");
    setNotes(transaction.notes ?? "");
    setReason("");
    setErrors({});

    // Reconstruct posting sides: debit → toFund, credit → fromFund
    const debit = postings.find((p) => p.direction === "debit");
    const credit = postings.find((p) => p.direction === "credit");
    if (debit) setToFund(debit.fund_key);
    if (credit) setFromFund(credit.fund_key);
  }, [open, transaction, postings]);

  const fundOptions = funds.map((f) => ({ value: f.key, label: f.label }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    const amt = parseNumberOrNull(amount);
    if (!date) next.date = "Date is required.";
    if (amt === null || amt <= 0) next.amount = "Amount must be greater than zero.";
    if (!description.trim()) next.description = "Description is required.";
    if (mode === "transfer" && fromFund === toFund) {
      next.toFund = "Funds must differ.";
    }
    if (!reason.trim()) next.reason = "Describe what you're changing and why.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
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
      const newKind = KIND_BY_MODE[mode];

      const postings: {
        fund_key: string;
        direction: "debit" | "credit";
        amount: number;
      }[] = [
        { fund_key: toFund, direction: "debit", amount: amt },
        { fund_key: fromFund, direction: "credit", amount: amt },
      ];

      await amendTransaction(
        supabase,
        user.id,
        transaction.id,
        {
          occurred_on: date,
          kind: newKind,
          description: description.trim(),
          amount: amt,
          currency,
          exchange_rate_to_usd: r,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          linked_withdrawal_id: transaction.linked_withdrawal_id,
          linked_purchase_id: transaction.linked_purchase_id,
        },
        postings as never,
        reason.trim()
      );

      toast.success("Transaction amended", "Original reversed, replacement posted.");
      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not amend transaction.";
      toast.error("Failed to amend", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!transaction) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Transaction"
      description="Editing posts a reversal of the original plus a linked replacement. The audit trail is preserved."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-3xs text-warn-text">
          This will reverse the original transaction and post a replacement. Both
          entries remain in the ledger.
        </div>

        <Field label="Transaction type" htmlFor="edit_mode">
          <Select
            id="edit_mode"
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
          <Field label="Date" htmlFor="edit_date" required error={errors.date}>
            <Input
              id="edit_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              invalid={!!errors.date}
            />
          </Field>
          <Field label="Amount" htmlFor="edit_amount" required error={errors.amount}>
            <Input
              id="edit_amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              invalid={!!errors.amount}
              prefix="$"
            />
          </Field>
          <Field label="Currency" htmlFor="edit_currency">
            <Select
              id="edit_currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={["USD", "KES"]}
            />
          </Field>
        </div>

        {currency !== "USD" && (
          <Field label={`Exchange rate — 1 ${currency} in USD`} htmlFor="edit_rate">
            <Input
              id="edit_rate"
              type="number"
              step="0.00000001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Debit fund (money in)" htmlFor="edit_to_fund">
            <Select
              id="edit_to_fund"
              value={toFund}
              onChange={(e) => setToFund(e.target.value)}
              options={fundOptions}
            />
          </Field>
          <Field label="Credit fund (money out)" htmlFor="edit_from_fund" error={errors.toFund}>
            <Select
              id="edit_from_fund"
              value={fromFund}
              onChange={(e) => setFromFund(e.target.value)}
              options={fundOptions}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="edit_description" required error={errors.description}>
          <Input
            id="edit_description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            invalid={!!errors.description}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Reference" htmlFor="edit_reference">
            <Input
              id="edit_reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
          <Field label="Notes" htmlFor="edit_notes">
            <Textarea
              id="edit_notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Reason for edit"
          htmlFor="edit_reason"
          required
          error={errors.reason}
          hint="Recorded against the reversal for the audit trail."
        >
          <Textarea
            id="edit_reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Corrected amount — I typo'd $100 instead of $10"
            invalid={!!errors.reason}
          />
        </Field>
      </form>
    </Modal>
  );
}
