import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyAnalysis } from "@/lib/types";

export async function getDailyAnalysis(
  supabase: SupabaseClient,
  accountId: string,
  date: string
): Promise<DailyAnalysis | null> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .select("*")
    .eq("account_id", accountId)
    .eq("analysis_date", date)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyAnalysis | null) ?? null;
}

export async function listDailyAnalyses(
  supabase: SupabaseClient,
  accountId: string,
  limit = 60
): Promise<DailyAnalysis[]> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .select("*")
    .eq("account_id", accountId)
    .order("analysis_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyAnalysis[];
}

export async function getDailyAnalysisById(
  supabase: SupabaseClient,
  id: string
): Promise<DailyAnalysis | null> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyAnalysis | null) ?? null;
}

export type DailyAnalysisInsert = Omit<
  DailyAnalysis,
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type DailyAnalysisUpdate = Partial<DailyAnalysisInsert>;

export async function createDailyAnalysis(
  supabase: SupabaseClient,
  userId: string,
  values: DailyAnalysisInsert
): Promise<DailyAnalysis> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyAnalysis;
}

export async function updateDailyAnalysis(
  supabase: SupabaseClient,
  id: string,
  values: DailyAnalysisUpdate
): Promise<DailyAnalysis> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyAnalysis;
}

export async function upsertDailyAnalysis(
  supabase: SupabaseClient,
  userId: string,
  values: DailyAnalysisInsert
): Promise<DailyAnalysis> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .upsert(
      { ...values, user_id: userId },
      { onConflict: "account_id,analysis_date" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyAnalysis;
}

export async function deleteDailyAnalysis(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("daily_analyses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
