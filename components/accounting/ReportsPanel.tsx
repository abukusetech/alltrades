"use client";

import * as React from "react";
import { FileBarChart } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SummaryCard } from "./SummaryCard";
import { MonthlyCashFlowChart } from "./reports/MonthlyCashFlowChart";
import { CategoryBreakdownChart } from "./reports/CategoryBreakdownChart";
import { SavingsGrowthChart } from "./reports/SavingsGrowthChart";
import { ExportButton } from "./ExportButton";
import { PrintStatement } from "./PrintStatement";
import {
  monthlyCashFlow,
  expenseBreakdown,
  incomeBreakdown,
  savingsGrowth,
  ytdSummary,
  withdrawalsByAccountSize,
} from "@/lib/accounting/reports";
import type {
  AccountingTransaction,
  AccountingLedgerEntry,
  AccountingWithdrawal,
  AccountingPurchase,
  FundBalance,
  AccountingSettings,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function ReportsPanel({
  transactions,
  ledger,
  withdrawals,
  purchases,
  balances,
  settings,
}: {
  transactions: AccountingTransaction[];
  ledger: AccountingLedgerEntry[];
  withdrawals: AccountingWithdrawal[];
  purchases: AccountingPurchase[];
  balances: FundBalance[];
  settings: AccountingSettings | null;
}) {
  const cashFlow = React.useMemo(() => monthlyCashFlow(transactions, 12), [transactions]);
  const expenses = React.useMemo(() => expenseBreakdown(transactions), [transactions]);
  const income = React.useMemo(() => incomeBreakdown(transactions), [transactions]);
  const growth = React.useMemo(
    () => savingsGrowth(ledger, transactions, 12),
    [ledger, transactions]
  );
  const ytd = React.useMemo(() => ytdSummary(transactions, balances), [transactions, balances]);
  const bySize = React.useMemo(() => withdrawalsByAccountSize(withdrawals), [withdrawals]);

  // CSV exports
  const txnCsv = transactions.map((t) => ({
    date: t.occurred_on,
    kind: t.kind,
    description: t.description,
    amount: t.amount,
    currency: t.currency,
    amount_usd: t.amount_usd,
    reference: t.reference ?? "",
    notes: t.notes ?? "",
    reversed: t.reversed_by ? "yes" : "no",
  }));

  const withdrawalCsv = withdrawals.map((w) => ({
    request_date: w.request_date,
    prop_firm: w.prop_firm,
    account_size: w.account_size ?? "",
    gross: w.gross_requested,
    trader_share_percent: w.trader_share_percent,
    firm_share_percent: w.firm_share_percent,
    expected_net: w.expected_net_payout ?? "",
    fee: w.fee_amount,
    actual_net: w.actual_net_received ?? "",
    received_date: w.received_date ?? "",
    status: w.status,
    reference: w.reference ?? "",
  }));

  const purchaseCsv = purchases.map((p) => ({
    size: p.size,
    price: p.price,
    status: p.status,
    purchased_on: p.purchased_on ?? "",
    notes: p.notes ?? "",
  }));

  const balancesCsv = balances.map((b) => ({
    fund_key: b.fund_key,
    label: b.label,
    kind: b.kind,
    balance: b.balance,
  }));

  const hasAnyTxn = transactions.length > 0;
  const hasAnyWithdrawal = withdrawals.length > 0;

  return (
    <div className="space-y-6">
      {/* YTD summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-brand-600" />
            <CardTitle>Year to Date Summary</CardTitle>
          </div>
          <Badge tone="brand">{new Date().getFullYear()}</Badge>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Income YTD"
              value={formatCurrency(ytd.income)}
              tone={ytd.income > 0 ? "profit" : "neutral"}
            />
            <SummaryCard
              label="Expenses YTD"
              value={formatCurrency(ytd.expenses)}
              tone={ytd.expenses > 0 ? "loss" : "neutral"}
            />
            <SummaryCard
              label="Savings transfers YTD"
              value={formatCurrency(ytd.savingsTransfers)}
              tone="brand"
            />
            <SummaryCard
              label="Net cash flow YTD"
              value={formatCurrency(ytd.netCashFlow, { showSign: true })}
              tone={ytd.netCashFlow >= 0 ? "profit" : "loss"}
            />
          </div>
        </CardBody>
      </Card>

      {/* Charts */}
      <MonthlyCashFlowChart data={cashFlow} />
      <SavingsGrowthChart data={growth} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBreakdownChart
          title="Expense Breakdown"
          data={expenses}
          emptyMessage="No expenses recorded yet."
        />
        <CategoryBreakdownChart
          title="Income Breakdown"
          data={income}
          emptyMessage="No income recorded yet."
        />
      </div>

      {/* Withdrawals by account size */}
      <Card>
        <CardHeader>
          <CardTitle>Payouts by Account Size</CardTitle>
          <Badge tone="neutral">{bySize.length} sizes</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {bySize.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No paid withdrawals yet"
                description="Once you mark withdrawals as paid, they'll be summarised here."
                compact
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Account size</th>
                    <th className="px-4 py-2 text-right font-medium">Payouts</th>
                    <th className="px-4 py-2 text-right font-medium">Net received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bySize.map((b) => (
                    <tr key={b.size} className="hover:bg-surface-soft">
                      <td className="px-4 py-2.5 text-xs font-medium text-ink-900">
                        {b.label}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                        {b.count}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right text-xs font-semibold text-profit-text">
                        {formatCurrency(b.totalNet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Export + Print row */}
      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
          <Badge tone="neutral">CSV</Badge>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-2">
          <ExportButton
            filename={`alltrades-transactions-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={txnCsv}
            label="Export transactions"
            disabled={!hasAnyTxn}
          />
          <ExportButton
            filename={`alltrades-withdrawals-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={withdrawalCsv}
            label="Export withdrawals"
            disabled={!hasAnyWithdrawal}
          />
          <ExportButton
            filename={`alltrades-account-purchases-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={purchaseCsv}
            label="Export account purchases"
          />
          <ExportButton
            filename={`alltrades-fund-balances-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={balancesCsv}
            label="Export balances"
          />
          <div className="ml-auto">
            <PrintStatement
              summary={ytd}
              transactions={transactions}
              withdrawals={withdrawals}
              balances={balances}
              settings={settings}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
