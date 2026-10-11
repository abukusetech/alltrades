import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingSnapshot, AccountingLedgerEntry } from "@/lib/types";
import { getFundBalances, listLedger, listTransactions } from "./data";

export async function computeSnapshot(
  supabase: SupabaseClient,
  userId: string,
  opts: { from?: string; to?: string } = {}
): Promise<AccountingSnapshot> {
  const [txns, { balances }] = await Promise.all([
    listTransactions(supabase, userId, opts),
    getFundBalances(supabase, userId, opts),
  ]);

  const balance = (key: string) =>
    balances.find((b) => b.fund_key === key)?.balance ?? 0;

  // Sum helpers
  const sumTxns = (kinds: string[]) =>
    txns
      .filter((t) => kinds.includes(t.kind) && !t.reversed_by)
      .reduce((s, t) => s + Number(t.amount_usd), 0);

  const totalWithdrawalsReceived = sumTxns(["withdrawal_received"]);
  const totalProfitAfterSplit = totalWithdrawalsReceived; // net already includes split
  const totalAllocatedToAccounts = sumTxns(["allocation"]); // will be refined in UI
  const totalExpenses =
    sumTxns(["expense"]) + sumTxns(["account_purchase"]);
  const totalAccountPurchaseCost = sumTxns(["account_purchase"]);
  const totalPersonalTransfers = sumTxns(["savings_deposit"]);

  const businessCash = balance("business_cash");
  const personalSavings = balance("personal_savings");
  const accountFund = balance("account_fund");
  const emergencyReserve = balance("emergency_fund");

  // Net cash flow for the period
  const income = sumTxns(["withdrawal_received", "income", "refund"]);
  const outflow =
    sumTxns(["expense", "account_purchase"]) + totalPersonalTransfers;
  const netCashFlow = Number((income - outflow).toFixed(2));

  return {
    total_withdrawals_received: Number(totalWithdrawalsReceived.toFixed(2)),
    total_profit_after_split: Number(totalProfitAfterSplit.toFixed(2)),
    total_allocated_to_accounts: Number(totalAllocatedToAccounts.toFixed(2)),
    total_personal_savings: Number(personalSavings.toFixed(2)),
    business_cash_balance: Number(businessCash.toFixed(2)),
    total_expenses: Number(totalExpenses.toFixed(2)),
    total_personal_transfers: Number(totalPersonalTransfers.toFixed(2)),
    total_account_purchase_cost: Number(totalAccountPurchaseCost.toFixed(2)),
    emergency_reserve: Number(emergencyReserve.toFixed(2)),
    net_cash_flow: netCashFlow,
    balances,
  };
}

/** Recompute from ledger directly — used to double-check snapshots. */
export async function computeBalancesDirect(
  supabase: SupabaseClient,
  userId: string,
  opts: { from?: string; to?: string } = {}
): Promise<AccountingLedgerEntry[]> {
  return listLedger(supabase, userId, opts);
}
