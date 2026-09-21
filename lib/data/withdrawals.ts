import type { SupabaseClient } from "@supabase/supabase-js";
import type { Withdrawal } from "@/lib/types";

export async function listWithdrawals(
  supabase: SupabaseClient,
  accountId: string
): Promise<Withdrawal[]> {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("account_id", accountId)
    .order("withdrawal_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Withdrawal[];
}

export type WithdrawalInsert = Omit<
  Withdrawal,
  "id" | "user_id" | "created_at"
>;

export async function createWithdrawal(
  supabase: SupabaseClient,
  userId: string,
  values: WithdrawalInsert
): Promise<Withdrawal> {
  const { data, error } = await supabase
    .from("withdrawals")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Withdrawal;
}

export async function deleteWithdrawal(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("withdrawals").delete().eq("id", id);
  if (error) throw error;
}
