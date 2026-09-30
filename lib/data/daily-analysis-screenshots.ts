import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyAnalysisScreenshot } from "@/lib/types";

export async function listDailyAnalysisScreenshots(
  supabase: SupabaseClient,
  dailyAnalysisId: string
): Promise<DailyAnalysisScreenshot[]> {
  const { data, error } = await supabase
    .from("daily_analysis_screenshots")
    .select("*")
    .eq("daily_analysis_id", dailyAnalysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyAnalysisScreenshot[];
}

export async function addDailyAnalysisScreenshot(
  supabase: SupabaseClient,
  userId: string,
  dailyAnalysisId: string,
  storagePath: string,
  timeframe: string,
  label?: string
): Promise<DailyAnalysisScreenshot> {
  const { data, error } = await supabase
    .from("daily_analysis_screenshots")
    .insert({
      user_id: userId,
      daily_analysis_id: dailyAnalysisId,
      storage_path: storagePath,
      timeframe,
      label: label ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DailyAnalysisScreenshot;
}

export async function removeDailyAnalysisScreenshot(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("daily_analysis_screenshots")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
