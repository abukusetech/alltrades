// ALLTRADES — Accounting ledger primitives
// Pure helpers + a small set of Supabase-backed mutation functions.
// No UI concerns here.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountingFundKey,
  AccountingFundKind,
  AccountingLedgerEntry,
  AccountingTransaction,
  AccountingTransactionKind,
  FundBalance,
} from "@/lib/types";

// ---------- Pure helpers ----------

export interface Posting {
  fund_key: AccountingFundKey;
  direction: "debit" | "credit";
  amount: number;
}

/**
 * Post a transaction + its ledger entries.
 * Every financial event posts TWO ledger rows so that
 * "debits = credits" always holds.
 */
export async function postTransaction(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    occurred_on: string;
    kind: AccountingTransactionKind;
    description: string;
    amount: number;
    currency?: string;
    exchange_rate_to_usd?: number;
    reference?: string | null;
    notes?: string | null;
    linked_withdrawal_id?: string | null;
    linked_purchase_id?: string | null;
    reverses?: string | null;
  },
  postings: Posting[]
): Promise<{ transaction: AccountingTransaction; ledger: AccountingLedgerEntry[] }> {
  const rate = payload.exchange_rate_to_usd ?? 1;
  const amountUsd = Number((payload.amount * rate).toFixed(2));

  // Validate posting sums
  const debits = postings
    .filter((p) => p.direction === "debit")
    .reduce((s, p) => s + p.amount, 0);
  const credits = postings
    .filter((p) => p.direction === "credit")
    .reduce((s, p) => s + p.amount, 0);

  if (Math.abs(debits - credits) > 0.01) {
    throw new Error(
      `Ledger does not balance: debits ${debits.toFixed(2)} != credits ${credits.toFixed(2)}`
    );
  }

  // 1. Insert transaction
  const { data: txn, error: txnErr } = await supabase
    .from("accounting_transactions")
    .insert({
      user_id: userId,
      occurred_on: payload.occurred_on,
      kind: payload.kind,
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency ?? "USD",
      exchange_rate_to_usd: rate,
      amount_usd: amountUsd,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
      linked_withdrawal_id: payload.linked_withdrawal_id ?? null,
      linked_purchase_id: payload.linked_purchase_id ?? null,
      reverses: payload.reverses ?? null,
    })
    .select("*")
    .single();

  if (txnErr) throw txnErr;

  // 2. Insert ledger rows
  const rows = postings.map((p) => ({
    user_id: userId,
    transaction_id: txn.id,
    fund_key: p.fund_key,
    direction: p.direction,
    amount: p.amount,
  }));

  const { data: ledger, error: ledgerErr } = await supabase
    .from("accounting_ledger")
    .insert(rows)
    .select("*");

  if (ledgerErr) {
    // Best-effort rollback
    await supabase.from("accounting_transactions").delete().eq("id", txn.id);
    throw ledgerErr;
  }

  return {
    transaction: txn as AccountingTransaction,
    ledger: (ledger ?? []) as AccountingLedgerEntry[],
  };
}

/**
 * Post a plain transfer between two funds.
 * This is a technical operation and never creates income.
 */
export async function postTransfer(
  supabase: SupabaseClient,
  userId: string,
  args: {
    occurred_on: string;
    amount: number;
    from_fund: AccountingFundKey;
    to_fund: AccountingFundKey;
    description: string;
    kind?: AccountingTransactionKind;
    reference?: string | null;
    notes?: string | null;
    linked_withdrawal_id?: string | null;
    linked_purchase_id?: string | null;
  }
) {
  return postTransaction(
    supabase,
    userId,
    {
      occurred_on: args.occurred_on,
      kind: args.kind ?? "transfer",
      description: args.description,
      amount: args.amount,
      reference: args.reference ?? null,
      notes: args.notes ?? null,
      linked_withdrawal_id: args.linked_withdrawal_id ?? null,
      linked_purchase_id: args.linked_purchase_id ?? null,
    },
    [
      { fund_key: args.to_fund, direction: "debit", amount: args.amount },
      { fund_key: args.from_fund, direction: "credit", amount: args.amount },
    ]
  );
}

/**
 * Reverse a transaction by posting an opposite transaction.
 * The original stays; the reversal is linked via `reverses`.
 */
export async function reverseTransaction(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
  reason: string
) {
  // Load original + its postings
  const { data: original, error: loadErr } = await supabase
    .from("accounting_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (loadErr || !original) throw loadErr ?? new Error("Transaction not found");
  if (original.reversed_by) throw new Error("Transaction already reversed");

  const { data: postings, error: pErr } = await supabase
    .from("accounting_ledger")
    .select("*")
    .eq("transaction_id", transactionId);

  if (pErr) throw pErr;

  // Flip debit/credit
  const flipped = (postings ?? []).map((p) => ({
    fund_key: p.fund_key as AccountingFundKey,
    direction: p.direction === "debit" ? ("credit" as const) : ("debit" as const),
    amount: Number(p.amount),
  }));

  const { transaction: reversal } = await postTransaction(
    supabase,
    userId,
    {
      occurred_on: new Date().toISOString().slice(0, 10),
      kind: "correction",
      description: `Reversal: ${original.description}`,
      amount: Number(original.amount),
      currency: original.currency,
      exchange_rate_to_usd: Number(original.exchange_rate_to_usd),
      reference: original.reference,
      notes: `Reason: ${reason}`,
      reverses: original.id,
    },
    flipped
  );

  // Mark the original as reversed
  await supabase
    .from("accounting_transactions")
    .update({ reversed_by: reversal.id })
    .eq("id", original.id);

  return reversal;
}

/**
 * Compute balances from the ledger.
 * Every balance is derived; never stored as a mutable number.
 */
export function computeBalances(
  entries: AccountingLedgerEntry[],
  funds: { key: AccountingFundKey; label: string; kind: AccountingFundKind }[]
): FundBalance[] {
  const raw = new Map<AccountingFundKey, number>();
  for (const f of funds) raw.set(f.key, 0);

  for (const e of entries) {
    const current = raw.get(e.fund_key) ?? 0;
    const amount = Number(e.amount);
    // Assets/expenses: debit increases, credit decreases.
    // Income/liability/equity: credit increases, debit decreases.
    const fund = funds.find((f) => f.key === e.fund_key);
    const kind = fund?.kind ?? "asset";
    const isDebitNormal =
      kind === "asset" || kind === "expense";

    const delta =
      e.direction === (isDebitNormal ? "debit" : "credit")
        ? amount
        : -amount;

    raw.set(e.fund_key, current + delta);
  }

  return funds
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((f) => ({
      fund_key: f.key,
      label: f.label,
      kind: f.kind,
      balance: Number((raw.get(f.key) ?? 0).toFixed(2)),
    }));
}


/**
 * Amend a posted transaction by reversing it and posting a replacement.
 * The original stays; the replacement is linked via `reverses`.
 * The new transaction replaces the original's postings, so balances
 * always reflect the correction without breaking the double-entry invariant.
 */
export async function amendTransaction(
  supabase: SupabaseClient,
  userId: string,
  originalId: string,
  newPayload: {
    occurred_on: string;
    kind: AccountingTransactionKind;
    description: string;
    amount: number;
    currency?: string;
    exchange_rate_to_usd?: number;
    reference?: string | null;
    notes?: string | null;
    linked_withdrawal_id?: string | null;
    linked_purchase_id?: string | null;
  },
  newPostings: Posting[],
  reason: string
): Promise<{ replacement: AccountingTransaction; reversal: AccountingTransaction }> {
  // Load original
  const { data: original, error: loadErr } = await supabase
    .from("accounting_transactions")
    .select("*")
    .eq("id", originalId)
    .eq("user_id", userId)
    .single();

  if (loadErr || !original) throw loadErr ?? new Error("Transaction not found");
  if (original.reversed_by) {
    throw new Error("Transaction has already been amended or reversed");
  }

  // 1. Reverse the original
  const reversal = await reverseTransaction(
    supabase,
    userId,
    originalId,
    `Amended: ${reason}`
  );

  // 2. Post the replacement
  const { transaction: replacement } = await postTransaction(
    supabase,
    userId,
    {
      ...newPayload,
      reverses: originalId, // link forward to the original
    },
    newPostings
  );

  // 3. Mark the original as replaced (reversed_by → replacement)
  await supabase
    .from("accounting_transactions")
    .update({ reversed_by: replacement.id })
    .eq("id", originalId);

  // 4. Mark the reversal so it doesn't clutter the ledger as "reversal"
  await supabase
    .from("accounting_transactions")
    .update({
      description: `Original reversed (amended)`,
      notes: `Amended by ${replacement.id}. Reason: ${reason}`,
    })
    .eq("id", reversal.id);

  return { replacement, reversal };
}
