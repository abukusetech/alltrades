import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyAnalysis } from "@/lib/types";

export interface DailyAnalysisSnapshot {
  id: string;
  daily_analysis_id: string;
  user_id: string;
  snapshot: Record<string, unknown>;
  frozen_at: string;
  final_decision: string | null;
  created_at: string;
}

export async function createDailyAnalysisSnapshot(
  supabase: SupabaseClient,
  userId: string,
  analysis: DailyAnalysis
): Promise<DailyAnalysisSnapshot> {
  const snapshotPayload = {
    analysis_date: analysis.analysis_date,
    instrument: analysis.instrument,
    higher_timeframe_bias: analysis.higher_timeframe_bias,
    market_structure: analysis.market_structure,
    planned_direction: analysis.planned_direction,
    planned_entry: analysis.planned_entry,
    planned_stop_loss: analysis.planned_stop_loss,
    planned_take_profit: analysis.planned_take_profit,
    planned_risk_percent: analysis.planned_risk_percent,
    planned_risk_amount: analysis.planned_risk_amount,
    planned_rr: analysis.planned_rr,
    planned_expected_profit: analysis.planned_expected_profit,
    setup_model: (analysis as unknown as { setup_model?: string | null }).setup_model,
    planned_tp1: (analysis as unknown as { planned_tp1?: number | null }).planned_tp1,
    planned_tp2: (analysis as unknown as { planned_tp2?: number | null }).planned_tp2,
    planned_final_target: (analysis as unknown as { planned_final_target?: number | null }).planned_final_target,
    d1_analysis: analysis.d1_analysis,
    h4_analysis: analysis.h4_analysis,
    h1_analysis: analysis.h1_analysis,
    liquidity_narrative: analysis.liquidity_narrative,
    confirmation_states: analysis.confirmation_states,
    dealing_range: analysis.dealing_range,
    completion_percent: analysis.completion_percent,
    setup_quality_percent: analysis.setup_quality_percent,
    confirmation_percent: analysis.confirmation_percent,
    final_decision: analysis.final_decision,
    frozen_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("daily_analysis_snapshots")
    .insert({
      daily_analysis_id: analysis.id,
      user_id: userId,
      snapshot: snapshotPayload,
      final_decision: analysis.final_decision,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DailyAnalysisSnapshot;
}

export async function getLatestDailySnapshot(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<DailyAnalysisSnapshot | null> {
  const { data, error } = await supabase
    .from("daily_analysis_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("daily_analysis_id", analysisId)
    .order("frozen_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyAnalysisSnapshot | null) ?? null;
}
