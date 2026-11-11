"use client";

import * as React from "react";
import useSWR from "swr";
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
import { useCurrentAccount } from "@/components/layout/AppShell";
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
import { CashFlowByType } from "./CashFlowByType";
import { PeriodFilter, computePeriod, type PeriodValue } from "./PeriodFilter";
import { FundBalancesPanel } from "./FundBalancesPanel";
import { TransactionLedger } from "./TransactionLedger";
import { AddTransactionModal } from "./AddTransactionModal";
import { OwnerContributionModal } from "@/lib/accounting/OwnerContributionModal";
import { AccountPurchaseModal } from "@/lib/accounting/AccountPurchaseModal";
import { PlusCircle, ShoppingCart } from "lucide-react";
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

/**
 * Warm the Reports bundle in the background so opening the Reports tab
 * feels instant. The chunk is ~100 kB (Recharts). Firing this on idle
 * keeps the initial /accounting load light while making the tab instant.
 */
function warmReportsChunk() {
  if (typeof window === "undefined") return;
  const warm = () => {
    void import("./ReportsPanel").catch(() => {
      // best-effort prefetch
    });
  };
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(warm, { timeout: 3000 });
  } else {
    window.setTimeout(warm, 2000);
  }
}

export function AccountingClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();

  React.useEffect(() => {
    warmReportsChunk();
  }, []);
  const { accounts } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [tab, setTab] = React.useState<Tab>("overview");
  const [period, setPeriod] = React.useState<PeriodValue>(() =>
    computePeriod("month")
  );

  // Use SWR to cache the fetch so tab switching is instant
  const { data, isLoading: loading, mutate } = useSWR(
    ["accounting", currentAccountId, period.from, period.to],
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const [f, txs, ledgerRows, wds, ps, s] = await Promise.all([
        listFunds(supabase, user.id),
        listTransactions(supabase, user.id),
        listLedger(supabase, user.id),
        listWithdrawals(supabase, user.id),
        listPurchases(supabase, user.id),
        getSettings(supabase, user.id),
      ]);

      const computedBalances = computeBalances(
        ledgerRows,
        f.map((x) => ({ key: x.key, label: x.label, kind: x.kind }))
      );

      return {
        funds: f,
        transactions: txs,
        ledger: ledgerRows,
        balances: computedBalances,
        withdrawals: wds,
        purchases: ps,
        settings: s,
      };
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const funds = data?.funds ?? [];
  const allTransactions = data?.transactions ?? [];
  const allLedger = data?.ledger ?? [];
  const transactions = allTransactions.filter((t) => t.occurred_on >= period.from && t.occurred_on <= period.to);
  const ledger = allLedger.filter((entry) => {
    const txn = allTransactions.find((t) => t.id === entry.transaction_id);
    return !!txn && txn.occurred_on >= period.from && txn.occurred_on <= period.to;
  });
  const balances = data?.balances ?? [];
  const withdrawals = data?.withdrawals ?? [];
  const purchases = data?.purchases ?? [];
  const settings = data?.settings ?? null;

  const [addOpen, setAddOpen] = React.useState(false);
  const [ocOpen, setOcOpen] = React.useState(false);
  const [apOpen, setApOpen] = React.useState(false);
  const [apSize, setApSize] = React.useState<number | undefined>(undefined);
  const [reverseTarget, setReverseTarget] = React.useState<AccountingTransaction | null>(null);
  const [editTarget, setEditTarget] = React.useState<AccountingTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AccountingTransaction | null>(null);

  const [wFormOpen, setWFormOpen] = React.useState(false);
  const [wEditing, setWEditing] = React.useState<AccountingWithdrawal | null>(null);
  const [payTarget, setPayTarget] = React.useState<AccountingWithdrawal | null>(null);
  const [allocTarget, setAllocTarget] = React.useState<AccountingWithdrawal | null>(null);
  const [allocNet, setAllocNet] = React.useState<number | null>(null);

  



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
    return allLedger.filter((l) => l.transaction_id === editTarget.id);
  }, [editTarget, allLedger]);

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
        subtitle="A clear financial record of trading income, operating costs, cash reserves and account investments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void mutate()}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            {tab === "overview" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOcOpen(true)}
                  leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
                >
                  Owner Funding
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApOpen(true)}
                  leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}
                >
                  Buy Account
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Record Transaction
                </Button>
              </>
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
              <CashFlowByType
            transactions={transactions}
            accounts={accounts}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Withdrawals received" value={formatCurrency(totalWithdrawals)} hint={`${period.from} → ${period.to}`} tone={totalWithdrawals > 0 ? "profit" : "neutral"} />
                <SummaryCard label="Business cash" value={formatCurrency(balance("business_cash"))} tone={balance("business_cash") < 0 ? "loss" : "neutral"} />
                <SummaryCard label="Account fund" value={formatCurrency(balance("account_fund"))} hint="Reserved for future accounts" tone="brand" />
                <SummaryCard label="Personal savings" value={formatCurrency(balance("personal_savings"))} tone={balance("personal_savings") > 0 ? "profit" : "neutral"} />
                <SummaryCard label="Emergency reserve" value={formatCurrency(balance("emergency_fund"))} />
                <SummaryCard label="Account purchases" value={formatCurrency(totalAccountPurchaseCost)} tone="loss" />
                <SummaryCard label="Expenses" value={formatCurrency(totalExpenses)} tone={totalExpenses > 0 ? "loss" : "neutral"} />
                <SummaryCard label="Net cash flow" value={formatCurrency(netCashFlow, { showSign: true })} tone={netCashFlow >= 0 ? "profit" : "loss"} hint="Income less expenses and reserve allocations" />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transaction Register</CardTitle>
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
                onRefresh={() => void mutate()}
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
          key={transactions.length} // <--- FORCES REMOUNT WHEN TRANSACTIONS CHANGE
          accountFundBalance={balance("account_fund")}
          settings={settings}
          onBuyAccount={(size) => {
            setApSize(size);
            setApOpen(true);
          }}
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
          transactions={allTransactions}
          ledger={allLedger}
          withdrawals={withdrawals}
          purchases={purchases}
          balances={balances}
          settings={settings}
        />
      )}

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => void mutate()} funds={funds} />
      <OwnerContributionModal open={ocOpen} onClose={() => setOcOpen(false)} onSaved={() => void mutate()} />
      <AccountPurchaseModal 
        open={apOpen} 
        onClose={() => { setApOpen(false); setApSize(undefined); }} 
        onSaved={() => void mutate()} 
        initialSize={apSize}
        accountFundBalance={balance("account_fund")}
      />
      <ReverseTransactionModal transaction={reverseTarget} open={!!reverseTarget} onClose={() => setReverseTarget(null)} onReversed={() => void mutate()} />
      <EditTransactionModal transaction={editTarget} postings={editPostings} open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={() => void mutate()} funds={funds} />
      <DeleteTransactionModal transaction={deleteTarget} open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => void mutate()} />

      <WithdrawalFormModal
        open={wFormOpen}
        onClose={() => setWFormOpen(false)}
        onSaved={() => void mutate()}
        editing={wEditing}
        settings={settings}
        account={currentAccount}
      />
      <PaymentModal
        withdrawal={payTarget}
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={(updated, net) => {
          setAllocTarget(updated);
          setAllocNet(net);
          void mutate();
        }}
      />
      <AllocationModal
        withdrawal={allocTarget}
        netAmount={allocNet}
        open={!!allocTarget && allocNet !== null}
        onClose={() => { setAllocTarget(null); setAllocNet(null); }}
        onDone={() => { setAllocTarget(null); setAllocNet(null); void mutate(); }}
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

















