import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account } from "@/lib/types";

/**
 * Return true if the daily reference balance needs to be reset — i.e.
 * the stored `daily_reference_set_at` is on a different UTC date
 * than now.
 */
export function needsDailyReset(
  dailyReferenceSetAt: string | null,
  now = new Date()
): boolean {
  if (!dailyReferenceSetAt) return true;
  const then = new Date(dailyReferenceSetAt);
  return (
    then.getUTCFullYear() !== now.getUTCFullYear() ||
    then.getUTCMonth() !== now.getUTCMonth() ||
    then.getUTCDate() !== now.getUTCDate()
  );
}

/**
 * Update the daily reference balance to the higher of balance or equity.
 * Called at 00:00 UTC, or on first load if the stored reference is stale.
 */
export async function refreshDailyReference(
  supabase: SupabaseClient,
  accountId: string,
  currentBalance: number,
  currentEquity: number | null
): Promise<Account> {
  const reference = Math.max(currentBalance, currentEquity ?? currentBalance);
  const { data, error } = await supabase
    .from("accounts")
    .update({
      daily_reference_balance: reference,
      daily_reference_set_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Account;
}

/**
 * Raise the equity watermark if the current equity is higher.
 * The watermark only moves up, never down.
 */
export async function updateWatermarkIfHigher(
  supabase: SupabaseClient,
  accountId: string,
  currentWatermark: number,
  currentEquity: number | null
): Promise<Account | null> {
  const equity = currentEquity ?? 0;
  if (equity <= currentWatermark) return null;

  const { data, error } = await supabase
    .from("accounts")
    .update({ highest_equity_watermark: equity })
    .eq("id", accountId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Account;
}

/**
 * Set the current balance/equity snapshot on the account.
 */
export async function updateCurrentBalance(
  supabase: SupabaseClient,
  accountId: string,
  balance: number,
  equity: number | null
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update({
      current_balance: balance,
      current_equity: equity ?? balance,
    })
    .eq("id", accountId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Account;
}
