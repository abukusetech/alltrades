import type { SupabaseClient } from "@supabase/supabase-js";
import type { Analysis } from "@/lib/types";

export interface AnalysisFilters {
  accountId: string;
  instrument?: string;
  timeframe?: string;
  outcome?: string;
}

export async function listAnalyses(
  supabase: SupabaseClient,
  filters: AnalysisFilters
): Promise<Analysis[]> {
  let query = supabase
    .from("analyses")
    .select("*")
    .eq("account_id", filters.accountId)
    .order("analysis_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.instrument && filters.instrument !== "All instruments") {
    query = query.eq("instrument", filters.instrument);
  }
  if (filters.timeframe && filters.timeframe !== "All timeframes") {
    query = query.eq("timeframe", filters.timeframe);
  }
  if (filters.outcome && filters.outcome !== "All outcomes") {
    query = query.eq("outcome", filters.outcome);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Analysis[];
}

export async function getAnalysis(
  supabase: SupabaseClient,
  id: string
): Promise<Analysis | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Analysis | null) ?? null;
}

export type AnalysisInsert = Omit<
  Analysis,
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type AnalysisUpdate = Partial<AnalysisInsert>;

export async function createAnalysis(
  supabase: SupabaseClient,
  userId: string,
  values: AnalysisInsert
): Promise<Analysis> {
  const { data, error } = await supabase
    .from("analyses")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Analysis;
}

export async function updateAnalysis(
  supabase: SupabaseClient,
  id: string,
  values: AnalysisUpdate
): Promise<Analysis> {
  const { data, error } = await supabase
    .from("analyses")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Analysis;
}

export async function deleteAnalysis(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("analyses").delete().eq("id", id);
  if (error) throw error;
}
