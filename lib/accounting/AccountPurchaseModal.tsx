"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { postAccountPurchase } from "@/lib/accounting/ledger";
import { createClient } from "@/lib/supabase/client";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface AccountPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialSize?: number;
  accountFundBalance?: number;
}

export function AccountPurchaseModal({ open, onClose, onSaved, initialSize, accountFundBalance = 0 }: AccountPurchaseModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);

  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [amount, setAmount] = React.useState("");
  const [propFirm, setPropFirm] = React.useState("Maven");
  const [accountSize, setAccountSize] = React.useState("2000");
  const [paymentSource, setPaymentSource] = React.useState("account_fund");
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setDate(toDateKey(new Date()));
      setAmount("");
      setPropFirm("Maven");
      setAccountSize(initialSize ? String(initialSize) : "2000");
      setPaymentSource("account_fund");
      setDescription("");
      setNotes("");
    }
  }, [open, initialSize]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseNumberOrNull(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!description.trim()) return toast.error("Description is required");

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const sizeNum = parseNumberOrNull(accountSize) || 2000;

      // 1. Verify it's not already bought
      const { data: existing } = await supabase
        .from("accounting_account_purchases")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("size", sizeNum)
        .neq("status", "planned")
        .neq("status", "archived")
        .maybeSingle();

      if (existing) {
        throw new Error(`You have already purchased the $${sizeNum.toLocaleString()} account.`);
      }

      // 2. Post the ledger transaction
      const result = await postAccountPurchase(supabase, user.id, {
        occurred_on: date,
        amount: amt,
        description: description.trim(),
        payment_source: paymentSource as any,
        notes: notes.trim() || null,
      });

      // 3. Atomically UPSERT into the purchases table.
      // Because we have a unique index on (user_id, size), 
      // this will UPDATE the existing row (planned or otherwise) 
      // instead of ever creating a duplicate.
      const { error: upsertErr } = await supabase
        .from("accounting_account_purchases")
        .upsert({
          user_id: user.id,
          size: sizeNum,
          price: amt,
          status: "purchased",
          purchased_on: date,
          prop_firm_name: propFirm,
          payment_source: paymentSource,
          transaction_id: result.transaction.id,
          notes: notes.trim() || null,
        }, { onConflict: "user_id,size" });

      if (upsertErr) throw upsertErr;

      toast.success("Account purchase recorded successfully");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("PURCHASE ERROR:", err);
      toast.error("Failed to record purchase", err?.message || err?.details || "Check browser console");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Account Purchase"
      description="Buy a prop firm account. This is an expense, not a trading loss."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} loading={saving}>Record Purchase</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" htmlFor="ap_date" required>
            <Input id="ap_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Total Price" htmlFor="ap_amount" required>
            <Input id="ap_amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} prefix="$" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Prop Firm" htmlFor="ap_firm">
            <Input id="ap_firm" value={propFirm} onChange={(e) => setPropFirm(e.target.value)} />
          </Field>
          <Field label="Account Size ($)" htmlFor="ap_size">
            <Input id="ap_size" type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} />
          </Field>
        </div>

        <Field label="Paid From" htmlFor="ap_source">
          <Select
            id="ap_source"
            value={paymentSource}
            onChange={(e) => setPaymentSource(e.target.value)}
            options={[
              { value: "account_fund", label: "Account Fund (Recommended)" },
              { value: "business_cash", label: "Business Cash" },
              { value: "owner_capital", label: "Direct Personal Money" },
            ]}
          />
        </Field>

        <Field label="Description" htmlFor="ap_desc" required>
          <Input id="ap_desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Maven 2-Step $5k" />
        </Field>

        <Field label="Notes" htmlFor="ap_notes">
          <Textarea id="ap_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {paymentSource === "account_fund" && Number(amount) > accountFundBalance && (
          <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
            ⚠️ Insufficient funds. You only have ${accountFundBalance.toFixed(2)} in your Account Fund, but are trying to spend ${Number(amount || 0).toFixed(2)}.
          </div>
        )}
      </form>
    </Modal>
  );
}


