"use client";

import * as React from "react";
import {
  Plus,
  RefreshCw,
  Wallet,
  BookOpen,
  Layers,
  Target,
  TrendingUp,
  FileBarChart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { BlockLoader } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import {
  getSettings,
  listFunds,
  listLedger,
  listTransactions,
  listPurchases,
  listWithdrawals,
} from "@/lib/accounting/data";
import { computeBalances } from "@/lib/accounting/ledger";
import type {
  AccountingFund,
  AccountingPurchase,
  AccountingTransaction,
  AccountingLedgerEntry,
  AccountingWithdrawal,
  AccountingSettings,
  FundBalance,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { SummaryCard } from "./SummaryCard";
import { PeriodFilter, computePeriod, type PeriodValue } from "./PeriodFilter";
import { FundBalancesPanel } from "./FundBalancesPanel";
import { TransactionLedger } from "./TransactionLedger";
import { AddTransactionModal } from "./AddTransactionModal";
import { ReverseTransactionModal } from "./ReverseTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { DeleteTransactionModal } from "./DeleteTransactionModal";
import { WithdrawalsPanel } from "./WithdrawalsPanel";
import { WithdrawalsStatsRow } from "./WithdrawalsStatsRow";
import { WithdrawalFormModal } from "./WithdrawalFormModal";
import { PaymentModal } from "./PaymentModal";
import { AllocationModal } from "./AllocationModal";
import { AccountLadderPanel } from "./AccountLadderPanel";
import { UpgradePlannerPanel } from "./UpgradePlannerPanel";
import { GoalsPanel } from "./GoalsPanel";
import dynamic from "next/dynamic";

// Recharts is heavy (~100 kB). ReportsPanel and its charts only load
// when the Reports tab is actually opened.
const ReportsPanel = dynamic(
  () => import("./ReportsPanel").then((m) => m.ReportsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-white text-2xs text-ink-500">
        Loading reports…
      </div>
    ),
  }
);

type Tab = "overview" | "withdrawals" | "ladder" | "planner" | "goals" | "reports";

export function AccountingClient() {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [tab, setTab] = React.useState<Tab>("overview");
  const [period, setPeriod] = React.useState<PeriodValue>(() =>
    computePeriod("month")
  );

  const [funds, setFunds] = React.useState<AccountingFund[]>([]);
  const [transactions, setTransactions] = React.useState<AccountingTransaction[]>([]);
  const [ledger, setLedger] = React.useState<AccountingLedgerEntry[]>([]);
  const [balances, setBalances] = React.useState<FundBalance[]>([]);
  const [withdrawals, setWithdrawals] = React.useState<AccountingWithdrawal[]>([]);
  const [purchases, setPurchases] = React.useState<AccountingPurchase[]>([]);
  const [settings, setSettings] = React.useState<AccountingSettings | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [addOpen, setAddOpen] = React.useState(false);
  const [reverseTarget, setReverseTarget] = React.useState<AccountingTransaction | null>(null);
  const [editTarget, setEditTarget] = React.useState<AccountingTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AccountingTransaction | null>(null);

  const [wFormOpen, setWFormOpen] = React.useState(false);
  const [wEditing, setWEditing] = React.useState<AccountingWithdrawal | null>(null);
  const [payTarget, setPayTarget] = React.useState<AccountingWithdrawal | null>(null);
  const [allocTarget, setAllocTarget] = React.useState<AccountingWithdrawal | null>(null);
  const [allocNet, setAllocNet] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      const [f, txs, ledgerRows, wds, ps, s] = await Promise.all([
        listFunds(supabase, user.id),
        listTransactions(supabase, user.id, { from: period.from, to: period.to }),
        listLedger(supabase, user.id, { from: period.from, to: period.to }),
        listWithdrawals(supabase, user.id),
        listPurchases(supabase, user.id),
        getSettings(supabase, user.id),
      ]);
      setFunds(f);
      setTransactions(txs);
      setLedger(ledgerRows);
      setWithdrawals(wds);
      setPurchases(ps);
      setSettings(s);
      setBalances(
        computeBalances(
          ledgerRows,
          f.map((x) => ({ key: x.key, label: x.label, kind: x.kind }))
        )
      );
    } catch (err) {
      console.error("[ALLTRADES] accounting load failed", err);
      toast.error(
        "Could not load accounting",
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, period.from, period.to, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const balance = (key: string) =>
    balances.find((b) => b.fund_key === key)?.balance ?? 0;

  const totalWithdrawals = transactions
    .filter((t) => t.kind === "withdrawal_received" && !t.reversed_by)
    .reduce((s, t) => s + Number(t.amount_usd), 0);

  const totalExpenses = transactions
    .filter(
      (t) =>
        (t.kind === "expense" || t.kind === "account_purchase") && !t.reversed_by
    )
    .reduce((s, t) => s + Number(t.amount_usd), 0);

  const totalAccountPurchaseCost = transactions
    .filter((t) => t.kind === "account_purchase" && !t.reversed_by)
    .reduce((s, t) => s + Number(t.amount_usd), 0);

  const totalSavingsTransfers = transactions
    .filter((t) => t.kind === "savings_deposit" && !t.reversed_by)
    .reduce((s, t) => s + Number(t.amount_usd), 0);

  const income = transactions
    .filter(
      (t) =>
        (t.kind === "withdrawal_received" ||
          t.kind === "income" ||
          t.kind === "refund") &&
        !t.reversed_by
    )
    .reduce((s, t) => s + Number(t.amount_usd), 0);

  const outflow = totalExpenses + totalSavingsTransfers;
  const netCashFlow = income - outflow;

  const editPostings = React.useMemo(() => {
    if (!editTarget) return [];
    return ledger.filter((l) => l.transaction_id === editTarget.id);
  }, [editTarget, ledger]);

  function openAllocationFor(w: AccountingWithdrawal) {
    setAllocTarget(w);
    setAllocNet(
      w.actual_net_received !== null && w.actual_net_received !== undefined
        ? Number(w.actual_net_received)
        : null
    );
  }

  const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        subtitle="Track your trading business finances — funds, withdrawals, expenses and upgrades."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            {tab === "overview" && (
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Record Transaction
              </Button>
            )}
            {tab === "withdrawals" && (
              <Button
                size="sm"
                onClick={() => {
                  setWEditing(null);
                  setWFormOpen(true);
                }}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Record Withdrawal
              </Button>
            )}
          </div>
        }
      />

      <div className="border-b border-border">
        <nav
          className="-mx-4 flex flex-nowrap items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          role="tablist"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Overview"
          />
          <TabButton
            active={tab === "withdrawals"}
            onClick={() => setTab("withdrawals")}
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Withdrawals"
            count={withdrawals.length}
          />
          <TabButton
            active={tab === "ladder"}
            onClick={() => setTab("ladder")}
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Account Ladder"
          />
          <TabButton
            active={tab === "planner"}
            onClick={() => setTab("planner")}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Upgrade Planner"
          />
          <TabButton
            active={tab === "goals"}
            onClick={() => setTab("goals")}
            icon={<Target className="h-3.5 w-3.5" />}
            label="Goals"
          />
          <TabButton
            active={tab === "reports"}
            onClick={() => setTab("reports")}
            icon={<FileBarChart className="h-3.5 w-3.5" />}
            label="Reports"
          />
        </nav>
      </div>

      {tab === "overview" && (
        <>
          <Card>
            <CardBody className="py-3">
              <PeriodFilter value={period} onChange={setPeriod} />
            </CardBody>
          </Card>

          {loading ? (
            <BlockLoader label="Loading accounting data" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Withdrawals received" value={formatCurrency(totalWithdrawals)} hint={`${period.from} → ${period.to}`} tone={totalWithdrawals > 0 ? "profit" : "neutral"} />
                <SummaryCard label="Business cash" value={formatCurrency(balance("business_cash"))} tone={balance("business_cash") < 0 ? "loss" : "neutral"} />
                <SummaryCard label="Account fund" value={formatCurrency(balance("account_fund"))} hint="Reserved for future accounts" tone="brand" />
                <SummaryCard label="Personal savings" value={formatCurrency(balance("personal_savings"))} tone={balance("personal_savings") > 0 ? "profit" : "neutral"} />
                <SummaryCard label="Emergency reserve" value={formatCurrency(balance("emergency_fund"))} />
                <SummaryCard label="Account purchases" value={formatCurrency(totalAccountPurchaseCost)} tone="loss" />
                <SummaryCard label="Expenses" value={formatCurrency(totalExpenses)} tone={totalExpenses > 0 ? "loss" : "neutral"} />
                <SummaryCard label="Net cash flow" value={formatCurrency(netCashFlow, { showSign: true })} tone={netCashFlow >= 0 ? "profit" : "loss"} hint="Income minus expenses and savings transfers" />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transaction Ledger</CardTitle>
                      <span className="text-2xs text-ink-500">{transactions.length} entries</span>
                    </CardHeader>
                    <CardBody>
                      <TransactionLedger
                        transactions={transactions}
                        onReverse={(t) => setReverseTarget(t)}
                        onEdit={(t) => setEditTarget(t)}
                        onDelete={(t) => setDeleteTarget(t)}
                      />
                    </CardBody>
                  </Card>
                </div>
                <div>
                  <FundBalancesPanel balances={balances} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "withdrawals" && (
        <div className="space-y-4">
          <WithdrawalsStatsRow withdrawals={withdrawals} />
          <Card>
            <CardBody>
              <WithdrawalsPanel
                withdrawals={withdrawals}
                onRefresh={() => void load()}
                onAdd={() => { setWEditing(null); setWFormOpen(true); }}
                onEdit={(w) => { setWEditing(w); setWFormOpen(true); }}
                onMarkPaid={(w) => setPayTarget(w)}
                onAllocate={openAllocationFor}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "ladder" && (
        <AccountLadderPanel
          accountFundBalance={balance("account_fund")}
          settings={settings}
        />
      )}

      {tab === "planner" && (
        <UpgradePlannerPanel
          accountFundBalance={balance("account_fund")}
          businessCashBalance={balance("business_cash")}
          purchases={purchases}
          withdrawals={withdrawals}
          settings={settings}
          minimumReserve={minimumReserve}
        />
      )}

      {tab === "goals" && <GoalsPanel balances={balances} />}

      {tab === "reports" && (
        <ReportsPanel
          transactions={transactions}
          ledger={ledger}
          withdrawals={withdrawals}
          purchases={purchases}
          balances={balances}
          settings={settings}
        />
      )}

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => void load()} funds={funds} />
      <ReverseTransactionModal transaction={reverseTarget} open={!!reverseTarget} onClose={() => setReverseTarget(null)} onReversed={() => void load()} />
      <EditTransactionModal transaction={editTarget} postings={editPostings} open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={() => void load()} funds={funds} />
      <DeleteTransactionModal transaction={deleteTarget} open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => void load()} />

      <WithdrawalFormModal open={wFormOpen} onClose={() => setWFormOpen(false)} onSaved={() => void load()} editing={wEditing} settings={settings} />
      <PaymentModal
        withdrawal={payTarget}
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={(updated, net) => {
          setAllocTarget(updated);
          setAllocNet(net);
          void load();
        }}
      />
      <AllocationModal
        withdrawal={allocTarget}
        netAmount={allocNet}
        open={!!allocTarget && allocNet !== null}
        onClose={() => { setAllocTarget(null); setAllocNet(null); }}
        onDone={() => { setAllocTarget(null); setAllocNet(null); void load(); }}
        settings={settings}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors",
        active
          ? "border-brand-600 font-medium text-ink-900"
          : "border-transparent text-ink-500 hover:text-ink-800"
      )}
    >
      {icon}
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-3xs font-medium",
            active ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}


