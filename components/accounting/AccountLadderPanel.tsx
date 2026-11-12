"use client";

import * as React from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BlockLoader } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { listPurchases, updatePurchase } from "@/lib/accounting/data";
import type { AccountingPurchase, AccountingSettings } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { useTrades, useWithdrawals } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { AccountLadderStageCard, type PurchaseStatus } from "./AccountLadderStageCard";

export function AccountLadderPanel({
  accountFundBalance,
  settings,
  onBuyAccount,
}: {
  accountFundBalance: number;
  settings: AccountingSettings | null;
  onBuyAccount?: (size: number) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const { accounts } = useCurrentAccount();
  const { data: trades = [] } = useTrades(null);
  const { data: withdrawals = [] } = useWithdrawals(null);

  const [purchases, setPurchases] = React.useState<AccountingPurchase[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountingPurchase | null>(null);

  const load = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      let rows = await listPurchases(supabase, user.id);

      // Only initialise stages from prices the user explicitly configured.
      // Never create sample account sizes or provider prices automatically.
      if (rows.length === 0 && settings?.account_prices) {
        const configuredStages = Object.entries(settings.account_prices)
          .map(([size, price]) => ({ size: Number(size), price: Number(price) }))
          .filter((stage) =>
            Number.isFinite(stage.size) &&
            stage.size > 0 &&
            Number.isFinite(stage.price) &&
            stage.price >= 0
          )
          .sort((a, b) => a.size - b.size);

        if (configuredStages.length > 0) {
          const seedData = configuredStages.map((stage) => ({
            user_id: user.id,
            size: stage.size,
            price: stage.price,
            status: "planned",
          }));
          const { error } = await supabase
            .from("accounting_account_purchases")
            .insert(seedData);
          if (error) throw error;
          rows = await listPurchases(supabase, user.id);
        }
      }

      setPurchases(rows);
    } catch (err) {
      toast.error("Could not load ladder", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [supabase, settings, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sorted = React.useMemo(
    () => [...purchases].sort((a, b) => a.size - b.size),
    [purchases]
  );

  const totalSpent = sorted
    .filter((p) => p.status !== "planned" && p.status !== "archived")
    .reduce((s, p) => s + Number(p.price), 0);

  const nextStage = React.useMemo(
    () => sorted.find((p) => p.status === "planned"),
    [sorted]
  );

  const completedStages = sorted.filter(
    (p) => p.status !== "planned" && p.status !== "lost" && p.status !== "archived"
  ).length;
  const ladderPercent =
    sorted.length > 0 ? (completedStages / sorted.length) * 100 : 0;

  const remainingCost = sorted
    .filter((p) => p.status === "planned")
    .reduce((s, p) => s + Number(p.price), 0);

  async function onAdvance(p: AccountingPurchase, next: PurchaseStatus) {
    try {
      // ONLY check balance if moving from PLANNED to PURCHASED
      if (next === "purchased" && p.status === "planned") {
        if (accountFundBalance < Number(p.price)) {
          toast.error(
            "Insufficient funds",
            `You need at least $${p.price} in your Account Fund to mark this as purchased.`
          );
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await updatePurchase(supabase, user.id, p.id, {
        status: next,
        purchased_on:
          (next === "purchased" || next === "active") && !p.purchased_on
            ? new Date().toISOString().slice(0, 10)
            : p.purchased_on,
      });
      toast.success(`Marked ${next.replace("_", " ")}`);
      void load();
    } catch (err) {
      toast.error("Update failed", err instanceof Error ? err.message : undefined);
    }
  }

  async function onSaveEdit(values: Partial<AccountingPurchase>) {
    if (!editing) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await updatePurchase(supabase, user.id, editing.id, values);
      toast.success("Stage updated");
      setEditing(null);
      void load();
    } catch (err) {
      toast.error("Update failed", err instanceof Error ? err.message : undefined);
    }
  }

  if (loading) return <BlockLoader label="Loading ladder" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <CardTitle>Account Ladder Progress</CardTitle>
          </div>
          <Badge tone={sorted.length > 0 ? "brand" : "neutral"}>{sorted.length > 0 ? `${formatPercent(ladderPercent, 0)} complete` : "Not configured"}</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${ladderPercent}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Completed stages" value={`${completedStages} / ${sorted.length}`} />
            <Stat label="Account fund" value={formatCurrency(accountFundBalance)} tone={accountFundBalance > 0 ? "profit" : undefined} />
            <Stat label="Spent on accounts" value={formatCurrency(totalSpent)} />
            <Stat label="Remaining to buy" value={formatCurrency(remainingCost)} />
          </div>
          {nextStage && (
            <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-800">
              <span className="font-medium">Next account: ${nextStage.size.toLocaleString()}</span>{" "}
              — costs {formatCurrency(Number(nextStage.price))}.{" "}
              {accountFundBalance >= Number(nextStage.price)
                ? "✅ Fully funded by your Account Fund."
                : `⚠️ ${formatCurrency(Number(nextStage.price) - accountFundBalance)} short. Move funds to Account Fund to buy.`}
            </div>
          )}
        </CardBody>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-2xs font-medium uppercase tracking-wide text-ink-700">
              Your account progression
            </div>
            <p className="mt-0.5 text-3xs text-ink-500">
              Stages and prices come from your configured account plan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-soft px-5 py-8 text-center">
            <p className="text-sm font-semibold text-ink-900">No account stages configured</p>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-ink-600">
              Add your account sizes and purchase prices in Accounting Settings. Your ladder will be created from those values; no provider-specific prices are assumed.
            </p>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const isNext = nextStage?.id === p.id;
            const fundedPercent = Number(p.price) > 0 ? (accountFundBalance / Number(p.price)) * 100 : 0;
            
            const linkedAccount = p.linked_account_id ? accounts.find(a => a.id === p.linked_account_id) : null;
            let liveBalance = null;
            if (linkedAccount) {
               const accountTrades = trades.filter(t => t.account_id === linkedAccount.id);
               const accountWithdrawals = withdrawals.filter(w => w.account_id === linkedAccount.id);
               const metrics = computeAccountMetrics(linkedAccount, accountTrades, accountWithdrawals);
               liveBalance = metrics.currentCapital;
            }

            return (
              <AccountLadderStageCard
                key={p.id}
                purchase={p}
                isNext={isNext}
                fundedPercent={fundedPercent}
                onEdit={() => setEditing(p)}
                onAdvance={(next) => onAdvance(p, next)}
                onBuy={onBuyAccount ? () => onBuyAccount(p.size) : undefined}
                liveBalance={liveBalance}
              />
            );
          })}
        </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/40 p-4 pt-16">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-modal">
            <h3 className="text-sm font-semibold text-ink-900">
              Edit stage — ${editing.size.toLocaleString()}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-2xs font-medium uppercase tracking-wide text-ink-600">Price</label>
                <input type="number" step="0.01" className="mt-1 w-full rounded border border-border-strong px-3 py-1.5 text-sm" defaultValue={Number(editing.price)} id="edit_price" />
              </div>
              <div>
                <label className="text-2xs font-medium uppercase tracking-wide text-ink-600">Notes</label>
                <textarea className="mt-1 w-full rounded border border-border-strong px-3 py-1.5 text-sm" rows={3} defaultValue={editing.notes ?? ""} id="edit_notes" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => {
                  const priceEl = document.getElementById("edit_price") as HTMLInputElement | null;
                  const notesEl = document.getElementById("edit_notes") as HTMLTextAreaElement | null;
                  void onSaveEdit({
                    price: priceEl ? Number(priceEl.value) : Number(editing.price),
                    notes: notesEl?.value || null,
                  });
              }}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "profit" }) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={tone === "profit" ? "tabular mt-0.5 text-sm font-semibold text-profit-text" : "tabular mt-0.5 text-sm font-semibold text-ink-900"}>
        {value}
      </div>
    </div>
  );
}
