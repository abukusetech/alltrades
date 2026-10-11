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
import {
  buildWithdrawalFromInput,
  createWithdrawalRecord,
  updateWithdrawalRecord,
} from "@/lib/accounting/withdrawals";
import type { AccountingWithdrawal, AccountingSettings } from "@/lib/types";
import { parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface WithdrawalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: AccountingWithdrawal | null;
  settings: AccountingSettings | null;
}

export function WithdrawalFormModal({
  open,
  onClose,
  onSaved,
  editing,
  settings,
}: WithdrawalFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const isEdit = !!editing;

  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [propFirm, setPropFirm] = React.useState(settings?.default_prop_firm ?? "Maven");
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
    if (editing) {
      setDate(editing.request_date);
      setPropFirm(editing.prop_firm);
      setAccountSize(editing.account_size != null ? String(editing.account_size) : "");
      setEligible(editing.gross_profit_eligible != null ? String(editing.gross_profit_eligible) : "");
      setGross(String(editing.gross_requested));
      setTraderShare(String(editing.trader_share_percent));
      setFee(String(editing.fee_amount));
      setReference(editing.reference ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setDate(toDateKey(new Date()));
      setPropFirm(settings?.default_prop_firm ?? "Maven");
      setAccountSize("");
      setEligible("");
      setGross("");
      setTraderShare(String(settings?.default_trader_share_percent ?? 80));
      setFee("0");
      setReference("");
      setNotes("");
    }
    setErrors({});
  }, [open, editing, settings]);

  // Live preview of the expected net payout
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
    if (!propFirm.trim()) next.propFirm = "Prop firm is required.";
    const g = parseNumberOrNull(gross);
    if (g === null || g <= 0) next.gross = "Gross requested must be greater than zero.";
    const t = parseNumberOrNull(traderShare);
    if (t === null || t < 0 || t > 100) {
      next.traderShare = "Trader share must be between 0 and 100.";
    }
    const f = parseNumberOrNull(fee);
    if (f !== null && f < 0) next.fee = "Fee cannot be negative.";
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

      const input = {
        prop_firm: propFirm.trim(),
        account_size: parseNumberOrNull(accountSize),
        request_date: date,
        gross_profit_eligible: parseNumberOrNull(eligible),
        gross_requested: parseNumberOrNull(gross) as number,
        trader_share_percent: parseNumberOrNull(traderShare) as number,
        fee_amount: parseNumberOrNull(fee) ?? 0,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        currency: "USD",
        exchange_rate_to_usd: 1,
      };

      if (isEdit && editing) {
        const payload = buildWithdrawalFromInput(input);
        await updateWithdrawalRecord(supabase, user.id, editing.id, payload);
        toast.success("Withdrawal updated");
      } else {
        await createWithdrawalRecord(supabase, user.id, input);
        toast.success("Withdrawal recorded");
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save withdrawal.";
      toast.error("Failed to save", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Withdrawal" : "Record Withdrawal"}
      description="Track a payout from request through payment. Net payout is calculated as gross × trader share − fees."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Record withdrawal"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Request date" htmlFor="req_date" required error={errors.date}>
            <Input
              id="req_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              invalid={!!errors.date}
            />
          </Field>
          <Field label="Prop firm" htmlFor="prop_firm" required error={errors.propFirm}>
            <Input
              id="prop_firm"
              value={propFirm}
              onChange={(e) => setPropFirm(e.target.value)}
              invalid={!!errors.propFirm}
            />
          </Field>
          <Field label="Account size" htmlFor="account_size" hint="e.g. 2000, 5000">
            <Input
              id="account_size"
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              placeholder="2000"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gross profit eligible" htmlFor="eligible" hint="Optional">
            <Input
              id="eligible"
              type="number"
              step="0.01"
              value={eligible}
              onChange={(e) => setEligible(e.target.value)}
              prefix="$"
            />
          </Field>
          <Field label="Gross withdrawal requested" htmlFor="gross" required error={errors.gross}>
            <Input
              id="gross"
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
          <Field label="Trader share %" htmlFor="trader_share" required error={errors.traderShare}>
            <Input
              id="trader_share"
              type="number"
              step="0.01"
              value={traderShare}
              onChange={(e) => setTraderShare(e.target.value)}
              invalid={!!errors.traderShare}
              suffix="%"
            />
          </Field>
          <Field label="Firm share %" htmlFor="firm_share" hint="Auto">
            <Input
              id="firm_share"
              value={preview.firmPercent.toFixed(2)}
              disabled
              suffix="%"
            />
          </Field>
          <Field label="Fees" htmlFor="fee" error={errors.fee}>
            <Input
              id="fee"
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
      </form>
    </Modal>
  );
}
