"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { createWithdrawal } from "@/lib/data/withdrawals";
import type { Account } from "@/lib/types";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface WithdrawalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: Account;
  /** Force the kind based on which tab the user is on. */
  forceType?: "MAVEN" | "PERSONAL" | null;
}

type Kind = "MAVEN" | "PERSONAL";

export function WithdrawalFormModal({
  open,
  onClose,
  onSaved,
  account,
  forceType,
}: WithdrawalFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  // Kind resolution: explicit forceType wins, else use the account's type.
  const kind: Kind = React.useMemo(() => {
    if (forceType) return forceType;
    if (account.account_type === "PERSONAL") return "PERSONAL";
    return "MAVEN";
  }, [forceType, account.account_type]);

  const isPersonal = kind === "PERSONAL";

  const configuredTraderShare = account.maven_rules?.profit_split_percent;

  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [amount, setAmount] = React.useState("");       // personal
  const [propFirm, setPropFirm] = React.useState(account.broker || account.maven_rules?.program_label || account.maven_rules?.program || "Prop firm");
  const [accountSize, setAccountSize] = React.useState(""); // optional
  const [gross, setGross] = React.useState("");          // maven
  const [traderShare, setTraderShare] = React.useState(configuredTraderShare == null ? "" : String(configuredTraderShare));
  const [fee, setFee] = React.useState("0");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDate(toDateKey(new Date()));
    setAmount("");
    setPropFirm(isPersonal ? "Personal" : account.broker || account.maven_rules?.program_label || account.maven_rules?.program || "Prop firm");
    setAccountSize(
      account.starting_capital
        ? String(Math.round(Number(account.starting_capital)))
        : ""
    );
    setGross("");
    setTraderShare(configuredTraderShare == null ? "" : String(configuredTraderShare));
    setFee("0");
    setReference("");
    setNotes("");
    setErrors({});
  }, [open, isPersonal, account.starting_capital]);

  // Live preview for funded-account payouts
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

      const payload: Record<string, unknown> = {
        account_id: account.id,
        account_type: isPersonal ? "PERSONAL" : "MAVEN",
        withdrawal_date: date,
        status: "Recorded",
        notes: notes.trim() ? notes.trim() : null,
      };

      if (isPersonal) {
        const amt = parseNumberOrNull(amount) as number;
        payload.amount = amt;
        payload.gross_requested = amt;
        payload.trader_share_percent = 100;
        payload.firm_share_percent = 0;
        payload.expected_net_payout = amt;
        payload.fee_amount = 0;
        payload.prop_firm = "Personal";
      } else {
        const g = parseNumberOrNull(gross) as number;
        const t = parseNumberOrNull(traderShare) as number;
        const f = parseNumberOrNull(fee) ?? 0;
        payload.amount = preview.net;
        payload.gross_requested = g;
        payload.trader_share_percent = t;
        payload.firm_share_percent = preview.firmPercent;
        payload.expected_net_payout = preview.net;
        payload.fee_amount = f;
        payload.prop_firm = propFirm.trim() || account.broker || account.maven_rules?.program_label || account.maven_rules?.program || "Prop firm";
      }

      await createWithdrawal(supabase, user.id, payload as never);
      toast.success(
        isPersonal ? "Personal withdrawal recorded" : "Funded payout recorded"
      );
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isPersonal ? "Record Personal Withdrawal" : "Record Funded Payout"
      }
      description={
        isPersonal
          ? `Cash you took out of ${account.name}. No profit split, no firm cut.`
          : `Track a payout from ${account.name} through payment. Net = gross × trader share − fees.`
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isPersonal ? "Record withdrawal" : "Record payout"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* ---- Personal form ---- */}
        {isPersonal && (
          <>
            <div className="rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
              <strong>Personal Capital</strong> — {account.name}
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

            <Field
              label="Reference"
              htmlFor="wd_ref"
              hint="Optional — e.g. bank transfer reference"
            >
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
              Personal withdrawals do not go through a firm's profit split,
              consistency rule, or payout eligibility. The amount reduces your
              account capital by exactly what you withdraw.
            </div>
          </>
        )}

        {/* ---- Funded-account form ---- */}
        {!isPersonal && (
          <>
            <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-800">
              <strong>{account.broker || account.maven_rules?.program_label || account.maven_rules?.program || "Funded account"}</strong> — {account.name}
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
              <Field label="Prop firm" htmlFor="wd_prop_firm" required>
                <Input
                  id="wd_prop_firm"
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
                hint="Optional — total profit eligible for withdrawal"
              >
                <Input id="wd_eligible" type="number" step="0.01" prefix="$" />
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
              <Field label="Firm share %" htmlFor="wd_firm" hint="Auto">
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
