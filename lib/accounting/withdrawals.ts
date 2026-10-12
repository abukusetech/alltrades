// ALLTRADES — Withdrawal workflow + profit allocation
// Pure helpers + a small set of Supabase-backed mutation functions.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountingWithdrawal,
  AccountingAllocation,
  AccountingSettings,
} from "@/lib/types";

// ---------- Pure calculations ----------

/**
 * Compute the expected trader net payout:
 *   gross × (trader_share_percent / 100) − fee
 */
export function expectedNetPayout(
  grossRequested: number,
  traderSharePercent: number,
  feeAmount: number
): number {
  const traderCut = grossRequested * (traderSharePercent / 100);
  return Number((traderCut - feeAmount).toFixed(2));
}

/** Trader cut before fees. */
export function traderCut(gross: number, traderSharePercent: number): number {
  return Number((gross * (traderSharePercent / 100)).toFixed(2));
}

/** Firm cut. */
export function firmCut(gross: number, firmSharePercent: number): number {
  return Number((gross * (firmSharePercent / 100)).toFixed(2));
}

/**
 * Compute the 50/30/20 style allocation preview.
 * Returns the three amounts based on the settings percentages.
 */
export function previewAllocation(
  netAmount: number,
  settings: Pick<
    AccountingSettings,
    "account_fund_percent" | "savings_percent" | "business_percent"
  >
): {
  accountFundAmount: number;
  savingsAmount: number;
  businessAmount: number;
  total: number;
} {
  const acc = Number((netAmount * (settings.account_fund_percent / 100)).toFixed(2));
  const sav = Number((netAmount * (settings.savings_percent / 100)).toFixed(2));
  const biz = Number((netAmount * (settings.business_percent / 100)).toFixed(2));
  return {
    accountFundAmount: acc,
    savingsAmount: sav,
    businessAmount: biz,
    total: Number((acc + sav + biz).toFixed(2)),
  };
}

// ---------- Withdrawal workflow ----------

export interface NewWithdrawalInput {
  prop_firm: string;
  account_size: number | null;
  request_date: string;
  gross_profit_eligible: number | null;
  gross_requested: number;
  trader_share_percent: number;
  fee_amount: number;
  reference?: string | null;
  notes?: string | null;
  currency?: string;
  exchange_rate_to_usd?: number;
}

export function buildWithdrawalFromInput(input: NewWithdrawalInput): Omit<
  AccountingWithdrawal,
  "id" | "user_id" | "created_at" | "updated_at"
> {
  const firmSharePercent = Number(
    (100 - input.trader_share_percent).toFixed(2)
  );
  const expected = expectedNetPayout(
    input.gross_requested,
    input.trader_share_percent,
    input.fee_amount
  );

  return {
    prop_firm: input.prop_firm,
    account_size: input.account_size,
    request_date: input.request_date,
    gross_profit_eligible: input.gross_profit_eligible,
    gross_requested: input.gross_requested,
    trader_share_percent: input.trader_share_percent,
    firm_share_percent: firmSharePercent,
    expected_net_payout: expected,
    fee_amount: input.fee_amount,
    actual_net_received: null,
    received_date: null,
    status: "draft",
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    currency: input.currency ?? "USD",
    exchange_rate_to_usd: input.exchange_rate_to_usd ?? 1,
    account_id: null,
    account_type: null,
  };
}

export async function createWithdrawalRecord(
  supabase: SupabaseClient,
  userId: string,
  input: NewWithdrawalInput
): Promise<AccountingWithdrawal> {
  const payload = buildWithdrawalFromInput(input);
  const { data, error } = await supabase
    .from("accounting_withdrawals")
    .insert({ ...payload, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingWithdrawal;
}

export async function updateWithdrawalRecord(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  values: Partial<AccountingWithdrawal>
): Promise<AccountingWithdrawal> {
  // Auto-recompute expected_net_payout when gross/trader_share/fee change
  const merged = { ...values };
  if (
    merged.gross_requested !== undefined ||
    merged.trader_share_percent !== undefined ||
    merged.fee_amount !== undefined
  ) {
    const { data: existing } = await supabase
      .from("accounting_withdrawals")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (existing) {
      const gross = merged.gross_requested ?? Number(existing.gross_requested);
      const trader = merged.trader_share_percent ?? Number(existing.trader_share_percent);
      const fee = merged.fee_amount ?? Number(existing.fee_amount);

      merged.firm_share_percent = Number((100 - trader).toFixed(2));
      merged.expected_net_payout = expectedNetPayout(gross, trader, fee);
    }
  }

  const { data, error } = await supabase
    .from("accounting_withdrawals")
    .update(merged)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as AccountingWithdrawal;
}

export async function deleteWithdrawalRecord(
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

export async function getAllocationForWithdrawal(
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

/**
 * Mark a withdrawal as paid. Records the actual net received amount.
 * This does NOT post any ledger entries — those come from the allocation step.
 */
/**
 * Mark a withdrawal as paid and post the corresponding INCOME event.
 * This is the moment the money actually enters your books:
 *   Debit  business_cash      (money in)
 *   Credit trading_income     (source)
 * The later allocation step then spends from business_cash into funds.
 */
export async function markWithdrawalPaid(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  actual_net_received: number,
  received_date: string
): Promise<AccountingWithdrawal> {
  // 1. Update the withdrawal row
  const { data, error } = await supabase
    .from("accounting_withdrawals")
    .update({
      status: "paid",
      actual_net_received,
      received_date,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  // 2. Post the withdrawal_received transaction (income event).
  //    Idempotent: if a transaction with this linked_withdrawal_id and
  //    kind='withdrawal_received' already exists, we skip.
  const { data: existing } = await supabase
    .from("accounting_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("linked_withdrawal_id", id)
    .eq("kind", "withdrawal_received")
    .maybeSingle();

  if (!existing) {
    const { postTransaction } = await import("./ledger");
    await postTransaction(
      supabase,
      userId,
      {
        occurred_on: received_date,
        kind: "withdrawal_received",
        description: `${data.prop_firm} withdrawal paid${
          data.account_size ? ` · $${data.account_size.toLocaleString()}` : ""
        }`,
        amount: actual_net_received,
        currency: data.currency ?? "USD",
        exchange_rate_to_usd: Number(data.exchange_rate_to_usd ?? 1),
        reference: data.reference,
        notes: data.notes,
        linked_withdrawal_id: id,
      },
      [
        {
          fund_key: "business_cash",
          direction: "debit",
          amount: actual_net_received,
        },
        {
          fund_key: "trading_income",
          direction: "credit",
          amount: actual_net_received,
        },
      ]
    );
  }

  return data as AccountingWithdrawal;
}

/**
 * Reverse the income event for a withdrawal that was marked paid.
 * Used when you correct a mistaken "paid" status back to approved.
 */
export async function reverseWithdrawalIncome(
  supabase: SupabaseClient,
  userId: string,
  withdrawalId: string,
  reason: string
): Promise<void> {
  const { data: txn } = await supabase
    .from("accounting_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("linked_withdrawal_id", withdrawalId)
    .eq("kind", "withdrawal_received")
    .maybeSingle();

  if (!txn || txn.reversed_by) return;

  const { reverseTransaction } = await import("./ledger");
  await reverseTransaction(supabase, userId, txn.id, reason);
}


