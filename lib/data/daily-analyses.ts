import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyAnalysis } from "@/lib/types";

export async function getDailyAnalysis(
  supabase: SupabaseClient,
  accountId: string,
  date: string,
  instrument: string = "EURUSD"
): Promise<DailyAnalysis | null> {
  const { data, error } = await supabase
    .from("daily_analyses")
    .select("*")
    .eq("account_id", accountId)
    .eq("analysis_date", date)
    .eq("instrument", instrument)
    .order("updated_at", { ascending: false })
    .limit(1)
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
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "bias_tags"
  | "structure_tags"
  | "liquidity_tags"
  | "setup_tags"
  | "session_tags"
  | "news_tags"
  | "readiness_percent"
  | "active_plan_id"
  | "session"
  | "market_condition"
  | "setup_confirmation"
  | "daily_decision"
  | "computed_lot_size"
  | "computed_risk_amount"
  | "computed_rr"
  | "computed_at"
  | "d1_analysis"
  | "h4_analysis"
  | "h1_analysis"
  | "m30_analysis"
  | "m15_analysis"
  | "m5_analysis"
  | "m1_analysis"
  | "dealing_range"
  | "liquidity_narrative"
  | "confirmation_states"
  | "completion_percent"
  | "setup_quality_percent"
  | "confirmation_percent"
  | "final_decision"
  | "is_frozen"
  | "frozen_at"
  | "setup_model"
  | "planned_tp1"
  | "planned_tp2"
  | "planned_final_target"
  | "planned_expected_reward"
> & {
  bias_tags?: string[] | null;
  structure_tags?: string[] | null;
  liquidity_tags?: string[] | null;
  setup_tags?: string[] | null;
  session_tags?: string[] | null;
  news_tags?: string[] | null;
  readiness_percent?: number | null;
  active_plan_id?: string | null;
  session?: string | null;
  market_condition?: string | null;
  setup_confirmation?: import("@/lib/types").SetupConfirmation | null;
  daily_decision?: "WAITING" | "CONFIRMED" | "NO_TRADE" | null;
  computed_lot_size?: number | null;
  computed_risk_amount?: number | null;
  computed_rr?: number | null;
  computed_at?: string | null;
  d1_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  h4_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  h1_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  m30_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  m15_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  m5_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  m1_analysis?: import("@/lib/types").TimeframeAnalysisJson | null;
  dealing_range?: import("@/lib/types").DealingRange | null;
  liquidity_narrative?: import("@/lib/types").LiquidityNarrative | null;
  confirmation_states?: import("@/lib/types").ConfirmationStates | null;
  completion_percent?: number | null;
  setup_quality_percent?: number | null;
  confirmation_percent?: number | null;
  final_decision?: import("@/lib/types").FinalDecision | null;
  is_frozen?: boolean | null;
  frozen_at?: string | null;
  setup_model?: string | null;
  planned_tp1?: number | null;
  planned_tp2?: number | null;
  planned_final_target?: number | null;
  planned_expected_reward?: number | null;
};

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

/**
 * Constraint-agnostic upsert.
 *
 * Works whether or not a unique index exists, and whether the unique key is
 * on (account_id, analysis_date) or (user_id, analysis_date). We:
 *   1. Look up an existing row for this account+date.
 *   2. If found: UPDATE by id.
 *   3. If not found: INSERT.
 *   4. Race-safe: if the INSERT fails because a concurrent insert won,
 *      retry as UPDATE.
 *
 * This removes any dependency on the `onConflict` clause matching the DB
 * schema, which is the most common cause of silent save failures.
 */
export async function upsertDailyAnalysis(
  supabase: SupabaseClient,
  userId: string,
  values: DailyAnalysisInsert
): Promise<DailyAnalysis> {
  const payload = { ...values, user_id: userId };
  const instrument = values.instrument || "EURUSD";

  // 1. Look for an EXISTING row for the SAME account + date + instrument.
  //    If a EURUSD row exists for today but we are saving XAUUSD, this
  //    query correctly returns null, so we insert a NEW row instead of
  //    overwriting the EURUSD one.
  const { data: existing, error: findErr } = await supabase
    .from("daily_analyses")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", values.account_id)
    .eq("analysis_date", values.analysis_date)
    .eq("instrument", instrument)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;

  // 2. UPDATE path — the exact same row exists
  if (existing?.id) {
    const { data, error } = await supabase
      .from("daily_analyses")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as DailyAnalysis;
  }

  // 3. INSERT path — no row for this (account, date, instrument) combination yet
  const { data, error } = await supabase
    .from("daily_analyses")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    // Race condition — another tab inserted a row for the same key first
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      const { data: winner, error: wErr } = await supabase
        .from("daily_analyses")
        .select("id")
        .eq("user_id", userId)
        .eq("account_id", values.account_id)
        .eq("analysis_date", values.analysis_date)
        .eq("instrument", instrument)
        .limit(1)
        .maybeSingle();
      if (wErr) throw wErr;
      if (winner?.id) {
        const { data: upd, error: uErr } = await supabase
          .from("daily_analyses")
          .update(payload)
          .eq("id", winner.id)
          .select("*")
          .single();
        if (uErr) throw uErr;
        return upd as DailyAnalysis;
      }
    }
    throw error;
  }

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







