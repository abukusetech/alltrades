"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
  AccountingTransaction,
  AccountingWithdrawal,
  FundBalance,
  AccountingSettings,
} from "@/lib/types";
import type { YtdSummary } from "@/lib/accounting/reports";
import { formatCurrency, formatDateLong } from "@/lib/utils";

export function PrintStatement({
  summary,
  transactions,
  withdrawals,
  balances,
  settings,
}: {
  summary: YtdSummary;
  transactions: AccountingTransaction[];
  withdrawals: AccountingWithdrawal[];
  balances: FundBalance[];
  settings: AccountingSettings | null;
}) {
  function onPrint() {
    window.print();
  }

  const year = new Date().getFullYear();
  const assetBalances = balances.filter((b) => b.kind === "asset");
  const totalAssets = assetBalances.reduce((s, b) => s + b.balance, 0);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onPrint}
        leftIcon={<Printer className="h-3.5 w-3.5" />}
        className="print:hidden"
      >
        Print statement
      </Button>

      <div className="hidden print:block print:bg-white print:text-black">
        <div className="mx-auto max-w-3xl p-8">
          <div className="border-b border-black pb-4">
            <div className="text-xs uppercase tracking-widest">
              ALLTRADES — Trading Business Statement
            </div>
            <h1 className="mt-2 text-2xl font-bold">Financial Summary</h1>
            <div className="mt-1 text-xs">
              Year {year} · Generated {formatDateLong(new Date())}
            </div>
          </div>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase">Balances</h2>
            <table className="mt-2 w-full border-collapse text-xs">
              <tbody>
                {assetBalances.map((b) => (
                  <tr key={b.fund_key} className="border-b border-gray-300">
                    <td className="py-1">{b.label}</td>
                    <td className="py-1 text-right tabular">
                      {formatCurrency(b.balance)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-1">Total Assets</td>
                  <td className="py-1 text-right tabular">
                    {formatCurrency(totalAssets)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase">Year to Date</h2>
            <table className="mt-2 w-full border-collapse text-xs">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1">Income</td>
                  <td className="py-1 text-right tabular">
                    {formatCurrency(summary.income)}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1">Expenses</td>
                  <td className="py-1 text-right tabular">
                    {formatCurrency(summary.expenses)}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1">Savings transfers</td>
                  <td className="py-1 text-right tabular">
                    {formatCurrency(summary.savingsTransfers)}
                  </td>
                </tr>
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-1">Net cash flow</td>
                  <td className="py-1 text-right tabular">
                    {formatCurrency(summary.netCashFlow)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase">
              Recent Transactions
            </h2>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-1">Date</th>
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter((t) => !t.reversed_by)
                  .slice(0, 25)
                  .map((t) => (
                    <tr key={t.id} className="border-b border-gray-300">
                      <td className="py-1">{t.occurred_on}</td>
                      <td className="py-1">{t.description}</td>
                      <td className="py-1 text-right tabular">
                        {formatCurrency(Number(t.amount_usd), { showSign: true })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase">
              Withdrawals
            </h2>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-1">Date</th>
                  <th className="py-1">Firm</th>
                  <th className="py-1">Status</th>
                  <th className="py-1 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-gray-300">
                    <td className="py-1">{w.request_date}</td>
                    <td className="py-1">{w.prop_firm}</td>
                    <td className="py-1">{w.status}</td>
                    <td className="py-1 text-right tabular">
                      {w.actual_net_received !== null
                        ? formatCurrency(Number(w.actual_net_received))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {settings && (
            <section className="mt-6 text-3xs text-gray-700">
              <p>
                Split: {settings.default_trader_share_percent}% trader /{" "}
                {100 - settings.default_trader_share_percent}% firm.
                Allocation: {settings.account_fund_percent}% account fund,{" "}
                {settings.savings_percent}% savings,{" "}
                {settings.business_percent}% business. USD/KES rate:{" "}
                {settings.usd_kes_rate}.
              </p>
            </section>
          )}

          <div className="mt-8 border-t border-black pt-2 text-3xs">
            ALLTRADES — Generated for {settings?.default_prop_firm ?? "Maven"} account business
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
          }
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
