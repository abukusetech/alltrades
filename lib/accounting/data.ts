import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountingFund,
  AccountingTransaction,
  AccountingLedgerEntry,
  AccountingSettings,
  AccountingWithdrawal,
  AccountingAllocation,
  AccountingPurchase,
  AccountingGoal,
  FundBalance,
} from "@/lib/types";
import { computeBalances } from "./ledger";

// ---------- Funds ----------

export async function listFunds(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountingFund[]> {
  const { data, error } = await supabase
    .from("accounting_funds")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccountingFund[];
}

// ---------- Transactions + Ledger ----------

export async function listTransactions(
  supabase: SupabaseClient,
  userId: string,
  opts: { from?: string; to?: string; limit?: number } = {}
): Promise<AccountingTransaction[]> {
  let q = supabase
    .from("accounting_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 500);

  if (opts.from) q = q.gte("occurred_on", opts.from);
  if (opts.to) q = q.lte("occurred_on", opts.to);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AccountingTransaction[];
}

export async function listLedger(
  supabase: SupabaseClient,
  userId: string,
  opts: { from?: string; to?: string } = {}
): Promise<AccountingLedgerEntry[]> {
  // Join with transactions to filter by date
  let q = supabase
    .from("accounting_ledger")
    .select("*, accounting_transactions!inner(occurred_on, reversed_by)")
    .eq("user_id", userId);

  if (opts.from) q = q.gte("accounting_transactions.occurred_on", opts.from);
  if (opts.to) q = q.lte("accounting_transactions.occurred_on", opts.to);

  const { data, error } = await q;
  if (error) throw error;

  // Exclude ledger rows whose parent transaction has been reversed
  return ((data ?? []) as (AccountingLedgerEntry & {
    accounting_transactions?: { reversed_by: string | null };
  })[])
    .filter((r) => !r.accounting_transactions?.reversed_by)
    .map(({ accounting_transactions, ...rest }) => rest as AccountingLedgerEntry);
}

export async function getFundBalances(
  supabase: SupabaseClient,
  userId: string,
  opts: { from?: string; to?: string } = {}
): Promise<{ funds: AccountingFund[]; balances: FundBalance[] }> {
  const [funds, entries] = await Promise.all([
    listFunds(supabase, userId),
    listLedger(supabase, userId, opts),
  ]);
  const balances = computeBalances(
    entries,
    funds.map((f) => ({ key: f.key, label: f.label, kind: f.kind }))
  );
  return { funds, balances };
}

// ---------- Withdrawals ----------

export async function listWithdrawals(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountingWithdrawal[]> {
  const { data, error } = await supabase
    .from("accounting_withdrawals")
    .select("*")
    .eq("user_id", userId)
    .order("request_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AccountingWithdrawal[];
}

export async function createWithdrawal(
  supabase: SupabaseClient,
  userId: string,
  values: Omit<AccountingWithdrawal, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AccountingWithdrawal> {
  const { data, error } = await supabase
    .from("accounting_withdrawals")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingWithdrawal;
}

export async function updateWithdrawal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  values: Partial<AccountingWithdrawal>
): Promise<AccountingWithdrawal> {
  const { data, error } = await supabase
    .from("accounting_withdrawals")
    .update(values)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingWithdrawal;
}

export async function deleteWithdrawal(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("accounting_withdrawals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------- Allocations ----------

export async function getAllocation(
  supabase: SupabaseClient,
  userId: string,
  withdrawalId: string
): Promise<AccountingAllocation | null> {
  const { data, error } = await supabase
    .from("accounting_allocations")
    .select("*")
    .eq("user_id", userId)
    .eq("withdrawal_id", withdrawalId)
    .maybeSingle();
  if (error) throw error;
  return (data as AccountingAllocation | null) ?? null;
}

export async function createAllocation(
  supabase: SupabaseClient,
  userId: string,
  values: Omit<AccountingAllocation, "id" | "user_id" | "created_at">
): Promise<AccountingAllocation> {
  const { data, error } = await supabase
    .from("accounting_allocations")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingAllocation;
}

// ---------- Account purchases ----------

export async function listPurchases(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountingPurchase[]> {
  const { data, error } = await supabase
    .from("accounting_account_purchases")
    .select("*")
    .eq("user_id", userId)
    .order("size", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccountingPurchase[];
}

export async function createPurchase(
  supabase: SupabaseClient,
  userId: string,
  values: Omit<AccountingPurchase, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AccountingPurchase> {
  const { data, error } = await supabase
    .from("accounting_account_purchases")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingPurchase;
}

export async function updatePurchase(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  values: Partial<AccountingPurchase>
): Promise<AccountingPurchase> {
  const { data, error } = await supabase
    .from("accounting_account_purchases")
    .update(values)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingPurchase;
}

export async function deletePurchase(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("accounting_account_purchases")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------- Goals ----------

export async function listGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountingGoal[]> {
  const { data, error } = await supabase
    .from("accounting_goals")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccountingGoal[];
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  values: Omit<AccountingGoal, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AccountingGoal> {
  const { data, error } = await supabase
    .from("accounting_goals")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingGoal;
}

export async function updateGoal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  values: Partial<AccountingGoal>
): Promise<AccountingGoal> {
  const { data, error } = await supabase
    .from("accounting_goals")
    .update(values)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingGoal;
}

export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("accounting_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------- Settings ----------

export async function getSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<AccountingSettings | null> {
  const { data, error } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AccountingSettings | null) ?? null;
}

export async function upsertSettings(
  supabase: SupabaseClient,
  userId: string,
  values: Partial<AccountingSettings>
): Promise<AccountingSettings> {
  const { data, error } = await supabase
    .from("accounting_settings")
    .upsert({ user_id: userId, ...values }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingSettings;
}

/**
 * Hard-delete a transaction and its ledger entries.
 * Only allowed when:
 *   - the transaction is not reversed
 *   - the transaction is not a reversal of another (kind != 'correction')
 *   - the transaction has not itself been reversed by another entry
 * Deletes both ledger rows and the transaction row in one operation.
 */
/**
 * Hard-delete a transaction and its ledger entries.
 *
 * Rules:
 * 1. If the transaction is a *replacement* (has `reverses` set), we delete
 *    the whole amendment chain: the replacement, its reversal, and we
 *    un-reverse the original so it becomes active again. Result: you're
 *    back to the pre-edit state.
 * 2. Otherwise, if the transaction has been reversed, we refuse — you must
 *    reverse its reversal chain, not delete it.
 * 3. Reversal entries (kind === 'correction') cannot be deleted individually
 *    UNLESS they belong to an amendment chain that we're collapsing (rule 1).
 * 4. Standalone transactions (income, expense, transfer) can be deleted
 *    freely as long as they haven't been reversed.
 */
export async function deleteTransaction(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  // 1. Load the transaction
  const { data: txn, error: loadErr } = await supabase
    .from("accounting_transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (loadErr || !txn) throw loadErr ?? new Error("Transaction not found");

  // ---------- CASE 1: this is a replacement (has `reverses`) ----------
  // Collapse the whole amendment chain.
  if (txn.reverses) {
    const originalId = txn.reverses;

    // Load the original
    const { data: original, error: origErr } = await supabase
      .from("accounting_transactions")
      .select("*")
      .eq("id", originalId)
      .eq("user_id", userId)
      .single();

    if (origErr || !original) {
      throw new Error("Could not find the original transaction of this amendment.");
    }

    // Find the reversal that points at the original AND was created between
    // the original and this replacement. It's the "correction" whose
    // `reverses` field is the original.
    const { data: reversalRows, error: revErr } = await supabase
      .from("accounting_transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("reverses", originalId)
      .eq("kind", "correction");

    if (revErr) throw revErr;

    // Delete ledger entries for the replacement
    const { error: ledgerReplErr } = await supabase
      .from("accounting_ledger")
      .delete()
      .eq("transaction_id", txn.id)
      .eq("user_id", userId);
    if (ledgerReplErr) throw ledgerReplErr;

    // Delete the replacement row
    const { error: delReplErr } = await supabase
      .from("accounting_transactions")
      .delete()
      .eq("id", txn.id)
      .eq("user_id", userId);
    if (delReplErr) throw delReplErr;

    // Delete the reversal(s) and their ledger entries
    if (reversalRows && reversalRows.length > 0) {
      const reversalIds = reversalRows.map((r) => r.id);

      const { error: ledgerRevErr } = await supabase
        .from("accounting_ledger")
        .delete()
        .in("transaction_id", reversalIds)
        .eq("user_id", userId);
      if (ledgerRevErr) throw ledgerRevErr;

      const { error: delRevErr } = await supabase
        .from("accounting_transactions")
        .delete()
        .in("id", reversalIds)
        .eq("user_id", userId);
      if (delRevErr) throw delRevErr;
    }

    // Restore the original — clear its `reversed_by`
    const { error: restoreErr } = await supabase
      .from("accounting_transactions")
      .update({ reversed_by: null })
      .eq("id", originalId)
      .eq("user_id", userId);
    if (restoreErr) throw restoreErr;

    return;
  }

  // ---------- CASE 2: original was reversed ----------
  if (txn.reversed_by) {
    throw new Error(
      "This transaction has been reversed or amended. Delete the replacement instead — that will collapse the amendment chain."
    );
  }

  // ---------- CASE 3: this is a standalone reversal (kind = correction) ----------
  if (txn.kind === "correction") {
    throw new Error(
      "Reversal entries cannot be deleted individually. Delete the replacement that created it, or leave it as an audit record."
    );
  }

  // ---------- CASE 4: has children that reference it ----------
  const { data: children } = await supabase
    .from("accounting_transactions")
    .select("id")
    .eq("reverses", id)
    .eq("user_id", userId);

  if (children && children.length > 0) {
    throw new Error(
      "This transaction has linked reversals or replacements. Delete the replacement instead."
    );
  }

  // ---------- CASE 5: plain delete ----------
  const { error: ledgerErr } = await supabase
    .from("accounting_ledger")
    .delete()
    .eq("transaction_id", id)
    .eq("user_id", userId);
  if (ledgerErr) throw ledgerErr;

  const { error: txnErr } = await supabase
    .from("accounting_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (txnErr) throw txnErr;
}

/**
 * Post a profit allocation and record the allocation row.
 * Called only after the user has confirmed the preview.
 * Posts three fund movements inside a single transaction event so the
 * ledger stays balanced.
 */
/**
 * Post a profit allocation and record the allocation row.
 * Called only after the user confirms the preview.
 *
 * Each posting moves money from business_cash into the target fund.
 * The total of the three debits equals the credit from business_cash,
 * so the double-entry ledger stays balanced.
 */
export async function createAllocationWithPostings(
  supabase: SupabaseClient,
  userId: string,
  args: {
    withdrawal_id: string;
    created_on: string;
    total_amount: number;
    account_fund_percent: number;
    savings_percent: number;
    business_percent: number;
    account_fund_amount: number;
    savings_amount: number;
    business_amount: number;
  }
): Promise<AccountingAllocation> {
  // 1. Idempotency: refuse if an allocation already exists for this withdrawal
  const { data: existing } = await supabase
    .from("accounting_allocations")
    .select("id")
    .eq("user_id", userId)
    .eq("withdrawal_id", args.withdrawal_id)
    .maybeSingle();

  if (existing) {
    throw new Error("This withdrawal has already been allocated.");
  }

  // 2. Sanity check: the three amounts should sum to total_amount
  const sum = Number(
    (args.account_fund_amount + args.savings_amount + args.business_amount).toFixed(2)
  );
  if (Math.abs(sum - args.total_amount) > 0.02) {
    throw new Error(
      `Allocation amounts ($${sum.toFixed(2)}) do not sum to total ($${args.total_amount.toFixed(2)}).`
    );
  }

  // 3. Record the allocation metadata
  const { data: alloc, error: allocErr } = await supabase
    .from("accounting_allocations")
    .insert({
      user_id: userId,
      withdrawal_id: args.withdrawal_id,
      created_on: args.created_on,
      total_amount: args.total_amount,
      account_fund_percent: args.account_fund_percent,
      savings_percent: args.savings_percent,
      business_percent: args.business_percent,
      account_fund_amount: args.account_fund_amount,
      savings_amount: args.savings_amount,
      business_amount: args.business_amount,
      confirmed: true,
    })
    .select("*")
    .single();

  if (allocErr) throw allocErr;

  // 4. Post the ledger transaction.
  //    Total debits = total credit = total_amount.
  const { postTransaction } = await import("./ledger");
  await postTransaction(
    supabase,
    userId,
    {
      occurred_on: args.created_on,
      kind: "allocation",
      description: `Profit allocation (${args.account_fund_percent}/${args.savings_percent}/${args.business_percent})`,
      amount: args.total_amount,
      linked_withdrawal_id: args.withdrawal_id,
    },
    [
      {
        fund_key: "account_fund",
        direction: "debit",
        amount: args.account_fund_amount,
      },
      {
        fund_key: "personal_savings",
        direction: "debit",
        amount: args.savings_amount,
      },
      {
        fund_key: "business_operating",
        direction: "debit",
        amount: args.business_amount,
      },
      {
        fund_key: "business_cash",
        direction: "credit",
        amount: args.total_amount,
      },
    ]
  );

  return alloc as AccountingAllocation;
}
