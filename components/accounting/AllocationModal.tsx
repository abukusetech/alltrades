"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  previewAllocation,
} from "@/lib/accounting/withdrawals";
import { createAllocationWithPostings } from "@/lib/accounting/data";
import type { AccountingSettings, AccountingWithdrawal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface AllocationModalProps {
  withdrawal: AccountingWithdrawal | null;
  netAmount: number | null; // actual_net_received
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  settings: AccountingSettings | null;
}

export function AllocationModal({
  withdrawal,
  netAmount,
  open,
  onClose,
  onDone,
  settings,
}: AllocationModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [accountPercent, setAccountPercent] = React.useState(
    String(settings?.account_fund_percent ?? 50)
  );
  const [savingsPercent, setSavingsPercent] = React.useState(
    String(settings?.savings_percent ?? 30)
  );
  const [businessPercent, setBusinessPercent] = React.useState(
    String(settings?.business_percent ?? 20)
  );

  React.useEffect(() => {
    if (!open) return;
    setAccountPercent(String(settings?.account_fund_percent ?? 50));
    setSavingsPercent(String(settings?.savings_percent ?? 30));
    setBusinessPercent(String(settings?.business_percent ?? 20));
  }, [open, settings]);

  const accP = Number(accountPercent) || 0;
  const savP = Number(savingsPercent) || 0;
  const bizP = Number(businessPercent) || 0;
  const sumPercent = Number((accP + savP + bizP).toFixed(2));

  const preview = React.useMemo(() => {
    if (netAmount === null) return null;
    return previewAllocation(netAmount, {
      account_fund_percent: accP,
      savings_percent: savP,
      business_percent: bizP,
    });
  }, [netAmount, accP, savP, bizP]);

  const [saving, setSaving] = React.useState(false);
  const valid = Math.abs(sumPercent - 100) < 0.01 && !!preview;

  async function onConfirm() {
    if (!withdrawal || !netAmount || !preview || !valid) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      await createAllocationWithPostings(supabase, user.id, {
        withdrawal_id: withdrawal.id,
        created_on: new Date().toISOString().slice(0, 10),
        total_amount: netAmount,
        account_fund_percent: accP,
        savings_percent: savP,
        business_percent: bizP,
        account_fund_amount: preview.accountFundAmount,
        savings_amount: preview.savingsAmount,
        business_amount: preview.businessAmount,
        source_fund:
          withdrawal.account_type === "PERSONAL"
            ? "personal_broker_cash"
            : "business_cash",
      });
      toast.success("Allocation posted", "Funds moved to your three accounts.");
      onDone();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not allocate.";
      toast.error("Allocation failed", msg);
    } finally {
      setSaving(false);
    }
  }

  if (!withdrawal || netAmount === null) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Profit Allocation"
      description="Split the net payout into your three funds. Nothing posts until you confirm."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={saving} disabled={!valid}>
            Confirm & allocate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-700">
          Net payout received:{" "}
          <span className="tabular font-semibold">
            {formatCurrency(netAmount)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Account fund %" htmlFor="acc_p">
            <Input
              id="acc_p"
              type="number"
              step="0.01"
              value={accountPercent}
              onChange={(e) => setAccountPercent(e.target.value)}
              suffix="%"
            />
          </Field>
          <Field label="Savings %" htmlFor="sav_p">
            <Input
              id="sav_p"
              type="number"
              step="0.01"
              value={savingsPercent}
              onChange={(e) => setSavingsPercent(e.target.value)}
              suffix="%"
            />
          </Field>
          <Field label="Business %" htmlFor="biz_p">
            <Input
              id="biz_p"
              type="number"
              step="0.01"
              value={businessPercent}
              onChange={(e) => setBusinessPercent(e.target.value)}
              suffix="%"
            />
          </Field>
        </div>

        <div
          className={
            valid
              ? "rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text"
              : "rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text"
          }
        >
          {valid
            ? `Total: ${sumPercent.toFixed(2)}% ✓`
            : `Percentages must add to 100%. Currently ${sumPercent.toFixed(2)}%.`}
        </div>

        {preview && (
          <div className="rounded border border-border bg-surface-soft p-3 space-y-2">
            <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
              Preview
            </div>
            <div className="grid grid-cols-3 gap-3">
              <PreviewRow
                label="Account Fund"
                value={preview.accountFundAmount}
                tone="brand"
              />
              <PreviewRow
                label="Personal Savings"
                value={preview.savingsAmount}
                tone="profit"
              />
              <PreviewRow
                label="Business Operating"
                value={preview.businessAmount}
                tone="neutral"
              />
            </div>
            <div className="border-t border-border pt-2 text-2xs">
              <span className="text-ink-600">Total to allocate: </span>
              <span className="tabular font-semibold text-ink-900">
                {formatCurrency(preview.total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PreviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "profit" | "neutral";
}) {
  const valueClass =
    tone === "profit"
      ? "text-profit-text"
      : tone === "brand"
        ? "text-brand-700"
        : "text-ink-900";
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className={`tabular mt-0.5 text-sm font-semibold ${valueClass}`}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

