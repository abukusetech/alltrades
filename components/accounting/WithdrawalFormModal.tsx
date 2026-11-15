"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  createWithdrawalRecord,
  updateWithdrawalRecord,
} from "@/lib/accounting/withdrawals";
import type { Account, AccountingWithdrawal, AccountingSettings } from "@/lib/types";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface WithdrawalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: Account | null;
  settings: AccountingSettings | null;
  editing?: AccountingWithdrawal | null;
  /** Force the kind based on the tab. */
  forceType?: "MAVEN" | "PERSONAL" | null;
}

type Kind = "MAVEN" | "PERSONAL";

export function WithdrawalFormModal({
  open,
  onClose,
  onSaved,
  account,
  settings,
  editing,
  forceType,
}: WithdrawalFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  // Kind resolution
  const kind: Kind = React.useMemo(() => {
    if (forceType) return forceType;
    if (editing?.account_type === "PERSONAL") return "PERSONAL";
    if (editing?.account_type === "MAVEN") return "MAVEN";
    if (account?.account_type === "PERSONAL") return "PERSONAL";
    return "MAVEN";
  }, [forceType, editing, account?.account_type]);

  const isPersonal = kind === "PERSONAL";

  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [amount, setAmount] = React.useState("");          // personal
  const [propFirm, setPropFirm] = React.useState(
    settings?.default_prop_firm ?? account?.funding_source ?? ""
  );
  const [accountSize, setAccountSize] = React.useState("");
  const [eligible, setEligible] = React.useState("");
  const [gross, setGross] = React.useState("");
  const [traderShare, setTraderShare] = React.useState(
    String(settings?.default_trader_share_percent ?? 80)
  );
  const [fee, setFee] = React.useState("0");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});

    if (editing) {
      setDate(editing.request_date);
      setPropFirm(editing.prop_firm);
      setAccountSize(editing.account_size != null ? String(editing.account_size) : "");
      setEligible(
        editing.gross_profit_eligible != null
          ? String(editing.gross_profit_eligible)
          : ""
      );
      setGross(String(editing.gross_requested));
      setTraderShare(String(editing.trader_share_percent));
      setFee(String(editing.fee_amount));
      setReference(editing.reference ?? "");
      setNotes(editing.notes ?? "");
      setAmount(
        editing.actual_net_received != null
          ? String(editing.actual_net_received)
          : ""
      );
    } else {
      setDate(toDateKey(new Date()));
      setAmount("");
      setPropFirm(isPersonal ? "Personal" : settings?.default_prop_firm ?? account?.funding_source ?? "");
      setAccountSize(
        account?.starting_capital
          ? String(Math.round(Number(account.starting_capital)))
          : ""
      );
      setEligible("");
      setGross("");
      setTraderShare(String(settings?.default_trader_share_percent ?? 80));
      setFee("0");
      setReference("");
      setNotes("");
    }
  }, [open, editing, isPersonal, settings, account?.starting_capital]);

  // Live payout split preview for prop firm accounts
  const preview = React.useMemo(() => {
    const g = parseNumberOrNull(gross) ?? 0;
    const t = parseNumberOrNull(traderShare) ?? 0;
    const f = parseNumberOrNull(fee) ?? 0;
    const firmPercent = Number((100 - t).toFixed(2));
    const trader = g * (t / 100);
    const firm = g * (firmPercent / 100);
    const net = Number((trader - f).toFixed(2));
    return { trader, firm, net, firmPercent };
  }, [gross, traderShare, fee]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!date) next.date = "Date is required.";

    if (isPersonal) {
      const amt = parseNumberOrNull(amount);
      if (amt === null || amt <= 0) {
        next.amount = "Amount must be greater than zero.";
      }
    } else {
      const g = parseNumberOrNull(gross);
      if (g === null || g <= 0) {
        next.gross = "Gross requested must be greater than zero.";
      }
      const t = parseNumberOrNull(traderShare);
      if (t === null || t < 0 || t > 100) {
        next.traderShare = "Trader share must be between 0 and 100.";
      }
      const f = parseNumberOrNull(fee);
      if (f !== null && f < 0) next.fee = "Fee cannot be negative.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !account) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }

      if (isPersonal) {
        // Personal withdrawals do not have a provider profit split. They record the amount taken from personal trading capital.
        const amt = parseNumberOrNull(amount) as number;

        if (editing) {
          await updateWithdrawalRecord(supabase, user.id, editing.id, {
            request_date: date,
            gross_requested: amt,
            trader_share_percent: 100,
            firm_share_percent: 0,
            expected_net_payout: amt,
            fee_amount: 0,
            notes: notes.trim() || null,
            reference: reference.trim() || null,
            prop_firm: "Personal",
            account_id: account.id,
          } as never);
        } else {
          // Create the withdrawal + mark it as paid immediately (personal flow)
          const created = await createWithdrawalRecord(supabase, user.id, {
            prop_firm: "Personal",
            account_size: Number(account.starting_capital) || null,
            request_date: date,
            gross_profit_eligible: null,
            gross_requested: amt,
            trader_share_percent: 100,
            fee_amount: 0,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
            currency: account.account_currency || "USD",
            exchange_rate_to_usd: 1,
          });

          // Link to the personal account and mark as paid
          await updateWithdrawalRecord(supabase, user.id, created.id, {
            account_id: account.id,
            status: "paid",
            actual_net_received: amt,
            received_date: date,
          } as never);

          // Ledger entries are posted by the allocation step, not here.
          // Record the personal withdrawal and mark it paid,
          // then let the user allocate it (or leave it unallocated).
        }

        toast.success("Personal withdrawal recorded");
      } else {
        // Prop firm payout flow
        const g = parseNumberOrNull(gross) as number;
        const t = parseNumberOrNull(traderShare) as number;
        const f = parseNumberOrNull(fee) ?? 0;

        if (editing) {
          await updateWithdrawalRecord(supabase, user.id, editing.id, {
            request_date: date,
            gross_profit_eligible: parseNumberOrNull(eligible),
            gross_requested: g,
            trader_share_percent: t,
            firm_share_percent: preview.firmPercent,
            expected_net_payout: preview.net,
            fee_amount: f,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
            prop_firm: propFirm.trim() || "Prop Firm",
            account_size: parseNumberOrNull(accountSize),
            account_id: account.id,
          } as never);
        } else {
          const created = await createWithdrawalRecord(supabase, user.id, {
            prop_firm: propFirm.trim() || "Prop Firm",
            account_size: parseNumberOrNull(accountSize),
            request_date: date,
            gross_profit_eligible: parseNumberOrNull(eligible),
            gross_requested: g,
            trader_share_percent: t,
            fee_amount: f,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
            currency: "USD",
            exchange_rate_to_usd: 1,
          });

          await updateWithdrawalRecord(supabase, user.id, created.id, {
            account_id: account.id,
          } as never);
        }

        toast.success("Prop firm payout recorded");
      }

      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save withdrawal.";
      toast.error("Failed to save", msg);
    } finally {
      setSaving(false);
    }
  }

  const title = editing
    ? isPersonal
      ? "Edit Personal Withdrawal"
      : "Edit Prop Firm Payout"
    : isPersonal
      ? "Record Personal Withdrawal"
      : "Record Prop Firm Payout";

  const description = isPersonal
    ? `Cash you took out of ${account?.name ?? "your personal account"}. No profit split, no firm cut.`
    : `Track a payout from ${account?.name ?? "your prop firm account"} through approval and payment.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {editing
              ? "Save changes"
              : isPersonal
                ? "Record withdrawal"
                : "Record payout"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* ---- Personal form ---- */}
        {isPersonal && (
          <>
            <div className="rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
              <strong>Personal Capital</strong> — {account?.name ?? "—"}
            </div>

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
              <Field
                label="Amount withdrawn"
                htmlFor="wd_amount"
                required
                error={errors.amount}
              >
                <Input
                  id="wd_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  invalid={!!errors.amount}
                  prefix="$"
                />
              </Field>
            </div>

            <Field label="Reference" htmlFor="wd_ref" hint="Optional">
              <Input
                id="wd_ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>

            <Field label="Notes" htmlFor="wd_notes">
              <Textarea
                id="wd_notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly living expenses, moved to savings"
              />
            </Field>

            <div className="rounded border border-border bg-surface-soft px-3 py-2 text-3xs text-ink-500">
              Personal withdrawals are separate from prop firm payout splits.
              Record the amount actually taken from your personal trading capital.
            </div>
          </>
        )}

        {/* ---- Prop firm payout form ---- */}
        {!isPersonal && (
          <>
            <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-800">
              <strong>Prop Firm Account</strong> — {account?.name ?? "—"}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Request date" htmlFor="wd_date" required error={errors.date}>
                <Input
                  id="wd_date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  invalid={!!errors.date}
                />
              </Field>
              <Field label="Prop firm" htmlFor="wd_prop" required>
                <Input
                  id="wd_prop"
                  value={propFirm}
                  onChange={(e) => setPropFirm(e.target.value)}
                />
              </Field>
              <Field label="Account size" htmlFor="wd_size" hint="e.g. 2000, 5000">
                <Input
                  id="wd_size"
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value)}
                  placeholder="2000"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Gross profit eligible"
                htmlFor="wd_eligible"
                hint="Optional"
              >
                <Input
                  id="wd_eligible"
                  type="number"
                  step="0.01"
                  value={eligible}
                  onChange={(e) => setEligible(e.target.value)}
                  prefix="$"
                />
              </Field>
              <Field
                label="Gross withdrawal requested"
                htmlFor="wd_gross"
                required
                error={errors.gross}
              >
                <Input
                  id="wd_gross"
                  type="number"
                  step="0.01"
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                  invalid={!!errors.gross}
                  prefix="$"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Trader share %"
                htmlFor="wd_trader"
                required
                error={errors.traderShare}
              >
                <Input
                  id="wd_trader"
                  type="number"
                  step="0.01"
                  value={traderShare}
                  onChange={(e) => setTraderShare(e.target.value)}
                  invalid={!!errors.traderShare}
                  suffix="%"
                />
              </Field>
              <Field label="Provider share %" htmlFor="wd_firm" hint="Auto">
                <Input
                  id="wd_firm"
                  value={preview.firmPercent.toFixed(2)}
                  disabled
                  suffix="%"
                />
              </Field>
              <Field label="Fees" htmlFor="wd_fee" error={errors.fee}>
                <Input
                  id="wd_fee"
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  invalid={!!errors.fee}
                  prefix="$"
                />
              </Field>
            </div>

            <div className="rounded border border-border bg-surface-soft p-3 text-2xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-3xs uppercase tracking-wide text-ink-500">
                    Trader cut
                  </div>
                  <div className="tabular font-semibold text-ink-900">
                    ${preview.trader.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-3xs uppercase tracking-wide text-ink-500">
                    Firm cut
                  </div>
                  <div className="tabular font-semibold text-ink-700">
                    ${preview.firm.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-3xs uppercase tracking-wide text-ink-500">
                    Expected net
                  </div>
                  <div className="tabular font-semibold text-profit-text">
                    ${preview.net.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <Field label="Reference" htmlFor="wd_ref">
              <Input
                id="wd_ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>

            <Field label="Notes" htmlFor="wd_notes">
              <Textarea
                id="wd_notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}

