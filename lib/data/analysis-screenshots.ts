import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisScreenshot } from "@/lib/types";

export async function listAnalysisScreenshots(
  supabase: SupabaseClient,
  analysisId: string
): Promise<AnalysisScreenshot[]> {
  const { data, error } = await supabase
    .from("analysis_screenshots")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnalysisScreenshot[];
}

export async function addAnalysisScreenshot(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  storagePath: string
): Promise<AnalysisScreenshot> {
  const { data, error } = await supabase
    .from("analysis_screenshots")
    .insert({
      user_id: userId,
      analysis_id: analysisId,
      storage_path: storagePath,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AnalysisScreenshot;
}

export async function removeAnalysisScreenshot(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("analysis_screenshots")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
