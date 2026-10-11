// ALLTRADES — Accounting reports
// Pure aggregation functions. No Supabase calls.

import type {
  AccountingTransaction,
  AccountingLedgerEntry,
  AccountingWithdrawal,
  AccountingPurchase,
  AccountingGoal,
} from "@/lib/types";

export interface MonthlyBucket {
  month: string;         // YYYY-MM
  label: string;         // Sep 2026
  income: number;
  expenses: number;
  savings: number;
  net: number;
}

export function monthlyCashFlow(
  transactions: AccountingTransaction[],
  monthsBack: number = 12
): MonthlyBucket[] {
  const now = new Date();
  const buckets: MonthlyBucket[] = [];
  const map = new Map<string, MonthlyBucket>();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    const b: MonthlyBucket = { month: key, label, income: 0, expenses: 0, savings: 0, net: 0 };
    buckets.push(b);
    map.set(key, b);
  }

  for (const t of transactions) {
    if (t.reversed_by) continue;
    const key = t.occurred_on.slice(0, 7);
    const bucket = map.get(key);
    if (!bucket) continue;
    const amt = Number(t.amount_usd);
    if (t.kind === "withdrawal_received" || t.kind === "income" || t.kind === "refund") {
      bucket.income += amt;
    } else if (t.kind === "expense" || t.kind === "account_purchase") {
      bucket.expenses += amt;
    } else if (t.kind === "savings_deposit") {
      bucket.savings += amt;
    }
    bucket.net = bucket.income - bucket.expenses - bucket.savings;
  }

  return buckets;
}

export interface CategoryBreakdown {
  key: string;
  label: string;
  total: number;
  count: number;
}

const EXPENSE_LABELS: Record<string, string> = {
  account_purchase: "Account purchases",
  expense: "Business expenses",
};

export function expenseBreakdown(
  transactions: AccountingTransaction[]
): CategoryBreakdown[] {
  const groups = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    if (t.reversed_by) continue;
    if (t.kind !== "expense" && t.kind !== "account_purchase") continue;
    const key = t.kind;
    const g = groups.get(key) ?? { total: 0, count: 0 };
    g.total += Number(t.amount_usd);
    g.count += 1;
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([key, { total, count }]) => ({
      key,
      label: EXPENSE_LABELS[key] ?? key,
      total,
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

export function incomeBreakdown(
  transactions: AccountingTransaction[]
): CategoryBreakdown[] {
  const groups = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    if (t.reversed_by) continue;
    if (t.kind !== "withdrawal_received" && t.kind !== "income" && t.kind !== "refund") continue;
    const key = t.kind;
    const g = groups.get(key) ?? { total: 0, count: 0 };
    g.total += Number(t.amount_usd);
    g.count += 1;
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([key, { total, count }]) => ({
      key,
      label: key.replace(/_/g, " "),
      total,
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface SavingsPoint {
  month: string;
  label: string;
  savings: number;
  accountFund: number;
  business: number;
  cash: number;
}

/**
 * Track how each key fund has grown month by month.
 * Computed from ledger history so it always matches the balances panel.
 */
export function savingsGrowth(
  ledger: AccountingLedgerEntry[],
  transactions: AccountingTransaction[],
  monthsBack: number = 12
): SavingsPoint[] {
  // Build a map: transaction_id -> occurred month
  const txnMonth = new Map<string, string>();
  for (const t of transactions) {
    txnMonth.set(t.id, t.occurred_on.slice(0, 7));
  }

  // Sort ledger rows chronologically
  const sortedLedger = [...ledger].sort((a, b) => {
    const ma = txnMonth.get(a.transaction_id) ?? "";
    const mb = txnMonth.get(b.transaction_id) ?? "";
    return ma.localeCompare(mb);
  });

  // Initialize buckets for the last N months
  const now = new Date();
  const buckets: SavingsPoint[] = [];
  const map = new Map<string, SavingsPoint>();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    const b: SavingsPoint = {
      month: key,
      label,
      savings: 0,
      accountFund: 0,
      business: 0,
      cash: 0,
    };
    buckets.push(b);
    map.set(key, b);
  }

  // Walk ledger chronologically, maintaining running balances,
  // and snapshot them into each bucket at the end of its month.
  const running: Record<string, number> = {
    personal_savings: 0,
    account_fund: 0,
    business_operating: 0,
    business_cash: 0,
  };

  let bucketIndex = 0;
  const cursor = buckets[0] ? buckets[0].month : "";

  for (const entry of sortedLedger) {
    const monthKey = txnMonth.get(entry.transaction_id) ?? "";
    if (!monthKey) continue;

    // Advance buckets as we cross month boundaries
    while (bucketIndex < buckets.length && buckets[bucketIndex].month < monthKey) {
      const b = buckets[bucketIndex];
      b.savings = running.personal_savings;
      b.accountFund = running.account_fund;
      b.business = running.business_operating;
      b.cash = running.business_cash;
      bucketIndex++;
    }

    // Apply this entry
    const dir = entry.direction === "debit" ? 1 : -1;
    // Asset/expense: debit increases; income: credit increases.
    // We only track asset funds here, so debit = + and credit = −.
    if (entry.fund_key in running) {
      running[entry.fund_key] += dir * Number(entry.amount);
    }
  }

  // Fill remaining buckets with final balances
  while (bucketIndex < buckets.length) {
    const b = buckets[bucketIndex];
    b.savings = running.personal_savings;
    b.accountFund = running.account_fund;
    b.business = running.business_operating;
    b.cash = running.business_cash;
    bucketIndex++;
  }

  void cursor;
  return buckets;
}

export interface WithdrawalBySize {
  size: string;
  label: string;
  count: number;
  totalNet: number;
}

export function withdrawalsByAccountSize(
  withdrawals: AccountingWithdrawal[]
): WithdrawalBySize[] {
  const groups = new Map<string, { count: number; totalNet: number }>();
  for (const w of withdrawals) {
    if (w.status !== "paid") continue;
    const key = w.account_size ? `$${w.account_size.toLocaleString()}` : "Unspecified";
    const g = groups.get(key) ?? { count: 0, totalNet: 0 };
    g.count += 1;
    g.totalNet += Number(w.actual_net_received ?? 0);
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([key, { count, totalNet }]) => ({
      size: key,
      label: key,
      count,
      totalNet,
    }))
    .sort((a, b) => b.totalNet - a.totalNet);
}

export interface YtdSummary {
  income: number;
  expenses: number;
  savingsTransfers: number;
  netCashFlow: number;
  accountPurchases: number;
  withdrawalsReceived: number;
  accountFundBalance: number;
  personalSavingsBalance: number;
  businessCashBalance: number;
}

export function ytdSummary(
  transactions: AccountingTransaction[],
  balances: { fund_key: string; balance: number }[]
): YtdSummary {
  const now = new Date();
  const yearPrefix = String(now.getFullYear());

  const inYear = transactions.filter(
    (t) => !t.reversed_by && t.occurred_on.startsWith(yearPrefix)
  );

  const sum = (kinds: string[]) =>
    inYear
      .filter((t) => kinds.includes(t.kind))
      .reduce((s, t) => s + Number(t.amount_usd), 0);

  const income = sum(["withdrawal_received", "income", "refund"]);
  const expenses = sum(["expense", "account_purchase"]);
  const savingsTransfers = sum(["savings_deposit"]);
  const accountPurchases = sum(["account_purchase"]);
  const withdrawalsReceived = sum(["withdrawal_received"]);

  const bal = (key: string) =>
    balances.find((b) => b.fund_key === key)?.balance ?? 0;

  return {
    income,
    expenses,
    savingsTransfers,
    netCashFlow: income - expenses - savingsTransfers,
    accountPurchases,
    withdrawalsReceived,
    accountFundBalance: bal("account_fund"),
    personalSavingsBalance: bal("personal_savings"),
    businessCashBalance: bal("business_cash"),
  };
}
