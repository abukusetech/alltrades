import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyAnalysisZone } from "@/lib/types";

export async function listZones(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<DailyAnalysisZone[]> {
  const { data, error } = await supabase
    .from("daily_analysis_zones")
    .select("*")
    .eq("user_id", userId)
    .eq("analysis_id", analysisId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyAnalysisZone[];
}

export interface ZoneInsert {
  analysis_id: string;
  name: string;
  timeframe: "D1" | "H4" | "H1" | "M30" | "M15" | "M5" | "M1" | "CUSTOM";
  zone_type: string;
  price?: number | null;
  price_high?: number | null;
  price_low?: number | null;
  direction?: "bullish" | "bearish" | "neutral" | null;
  importance?: "high" | "medium" | "low" | null;
  notes?: string | null;
  sort_order?: number;
}

export async function createZone(
  supabase: SupabaseClient,
  userId: string,
  values: ZoneInsert
): Promise<DailyAnalysisZone> {
  const { data, error } = await supabase
    .from("daily_analysis_zones")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyAnalysisZone;
}

export async function updateZone(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  values: Partial<ZoneInsert>
): Promise<DailyAnalysisZone> {
  const { data, error } = await supabase
    .from("daily_analysis_zones")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyAnalysisZone;
}

export async function deleteZone(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("daily_analysis_zones")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
