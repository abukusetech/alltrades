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

const DEFAULT_LADDER = [2000, 5000, 10000, 20000, 50000];

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

      // Seed initial ladder ONLY if the user has zero rows
      if (rows.length === 0) {
        const prices = settings?.account_prices ?? {
          "2000": 15,
          "5000": 19,
          "10000": 37,
          "20000": 68,
          "50000": 170,
        };
        const seedData = DEFAULT_LADDER.map((size) => ({
          user_id: user.id,
          size,
          price: prices[String(size)] ?? 0,
          status: "planned",
        }));
        await supabase.from("accounting_account_purchases").insert(seedData);
        rows = await listPurchases(supabase, user.id);
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
          <Badge tone="brand">{formatPercent(ladderPercent, 0)} complete</Badge>
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
          <div className="text-2xs font-medium uppercase tracking-wide text-ink-500">
            Progression: $2K → $50K
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>

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
