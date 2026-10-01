import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisSnapshot } from "@/lib/types";

export async function createSnapshot(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
  dailyAnalysisId: string | null,
  tradePlanId: string | null,
  snapshot: Record<string, unknown>
): Promise<AnalysisSnapshot> {
  const { data, error } = await supabase
    .from("analysis_snapshots")
    .insert({
      user_id: userId,
      trade_id: tradeId,
      daily_analysis_id: dailyAnalysisId,
      trade_plan_id: tradePlanId,
      snapshot,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AnalysisSnapshot;
}

export async function getSnapshotForTrade(
  supabase: SupabaseClient,
  tradeId: string
): Promise<AnalysisSnapshot | null> {
  const { data, error } = await supabase
    .from("analysis_snapshots")
    .select("*")
    .eq("trade_id", tradeId)
    .maybeSingle();
  if (error) throw error;
  return (data as AnalysisSnapshot | null) ?? null;
}

/**
 * Build the frozen pre-trade snapshot from a Daily Analysis + Trade Plan.
 * This is what the Journal reads forever, regardless of later analysis edits.
 */
export function buildSnapshotPayload(
  analysis: {
    id: string;
    analysis_date: string;
    instrument: string;
    higher_timeframe_bias: string | null;
    market_structure: string | null;
    key_levels: unknown;
    liquidity: unknown;
    expected_move: string | null;
    invalidation: string | null;
    scenarios: unknown;
    news_major: boolean;
    confirmation_checklist: unknown;
    bias_tags: string[] | null;
    structure_tags: string[] | null;
    liquidity_tags: string[] | null;
    setup_tags: string[] | null;
    session_tags: string[] | null;
    news_tags: string[] | null;
  },
  plan: {
    id: string;
    plan_code: string | null;
    direction: string | null;
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    sl_pips: number | null;
    tp_pips: number | null;
    risk_percent: number | null;
    risk_amount: number | null;
    rr: number | null;
    expected_profit: number | null;
  } | null
): Record<string, unknown> {
  return {
    frozen_at: new Date().toISOString(),
    analysis: {
      id: analysis.id,
      date: analysis.analysis_date,
      instrument: analysis.instrument,
      higher_timeframe_bias: analysis.higher_timeframe_bias,
      market_structure: analysis.market_structure,
      key_levels: analysis.key_levels,
      liquidity: analysis.liquidity,
      expected_move: analysis.expected_move,
      invalidation: analysis.invalidation,
      scenarios: analysis.scenarios,
      news_major: analysis.news_major,
      confirmation_checklist: analysis.confirmation_checklist,
      tags: {
        bias: analysis.bias_tags ?? [],
        structure: analysis.structure_tags ?? [],
        liquidity: analysis.liquidity_tags ?? [],
        setup: analysis.setup_tags ?? [],
        session: analysis.session_tags ?? [],
        news: analysis.news_tags ?? [],
      },
    },
    plan: plan
      ? {
          id: plan.id,
          code: plan.plan_code,
          direction: plan.direction,
          entry_price: plan.entry_price,
          stop_loss: plan.stop_loss,
          take_profit: plan.take_profit,
          sl_pips: plan.sl_pips,
          tp_pips: plan.tp_pips,
          risk_percent: plan.risk_percent,
          risk_amount: plan.risk_amount,
          rr: plan.rr,
          expected_profit: plan.expected_profit,
        }
      : null,
  };
}
