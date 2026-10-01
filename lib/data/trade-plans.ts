import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradePlan } from "@/lib/types";

export async function getTradePlanByAnalysis(
  supabase: SupabaseClient,
  analysisId: string
): Promise<TradePlan | null> {
  const { data, error } = await supabase
    .from("trade_plans")
    .select("*")
    .eq("daily_analysis_id", analysisId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as TradePlan | null) ?? null;
}

export async function getTradePlan(
  supabase: SupabaseClient,
  id: string
): Promise<TradePlan | null> {
  const { data, error } = await supabase
    .from("trade_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as TradePlan | null) ?? null;
}

export async function listTradePlans(
  supabase: SupabaseClient,
  accountId: string,
  limit = 90
): Promise<TradePlan[]> {
  const { data, error } = await supabase
    .from("trade_plans")
    .select("*")
    .eq("account_id", accountId)
    .order("plan_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TradePlan[];
}

export type TradePlanInsert = Omit<
  TradePlan,
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type TradePlanUpdate = Partial<TradePlanInsert>;

export async function createTradePlan(
  supabase: SupabaseClient,
  userId: string,
  values: TradePlanInsert
): Promise<TradePlan> {
  const { data, error } = await supabase
    .from("trade_plans")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as TradePlan;
}

export async function updateTradePlan(
  supabase: SupabaseClient,
  id: string,
  values: TradePlanUpdate
): Promise<TradePlan> {
  const { data, error } = await supabase
    .from("trade_plans")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TradePlan;
}

export async function deleteTradePlan(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("trade_plans").delete().eq("id", id);
  if (error) throw error;
}

export function generatePlanCode(date: string, sequence: number): string {
  const compact = date.replace(/-/g, "");
  const seq = String(sequence).padStart(2, "0");
  return `PLAN #${compact}-${seq}`;
}
