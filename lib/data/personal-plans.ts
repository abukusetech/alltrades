import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalTradingPlan } from "@/lib/types";

export async function getActivePersonalPlan(
  supabase: SupabaseClient,
  accountId: string
): Promise<PersonalTradingPlan | null> {
  const { data, error } = await supabase
    .from("personal_trading_plans")
    .select("*")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PersonalTradingPlan | null) ?? null;
}

export async function listPersonalPlans(
  supabase: SupabaseClient,
  accountId: string
): Promise<PersonalTradingPlan[]> {
  const { data, error } = await supabase
    .from("personal_trading_plans")
    .select("*")
    .eq("account_id", accountId)
    .order("effective_from", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PersonalTradingPlan[];
}

export async function createPersonalPlan(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  values: Partial<PersonalTradingPlan>
): Promise<PersonalTradingPlan> {
  const { data, error } = await supabase
    .from("personal_trading_plans")
    .insert({ ...values, user_id: userId, account_id: accountId })
    .select("*")
    .single();
  if (error) throw error;
  return data as PersonalTradingPlan;
}

export async function updatePersonalPlan(
  supabase: SupabaseClient,
  id: string,
  values: Partial<PersonalTradingPlan>
): Promise<PersonalTradingPlan> {
  const { data, error } = await supabase
    .from("personal_trading_plans")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as PersonalTradingPlan;
}
