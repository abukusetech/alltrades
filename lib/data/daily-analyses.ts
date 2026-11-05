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

  // 1. Try to find an existing row for this account + date
  const { data: existing, error: findErr } = await supabase
    .from("daily_analyses")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", values.account_id)
    .eq("analysis_date", values.analysis_date)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;

  // 2. UPDATE path
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

  // 3. INSERT path
  const { data, error } = await supabase
    .from("daily_analyses")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    // Race: another insert won. Fall back to UPDATE on the winner.
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      const { data: winner, error: wErr } = await supabase
        .from("daily_analyses")
        .select("id")
        .eq("user_id", userId)
        .eq("account_id", values.account_id)
        .eq("analysis_date", values.analysis_date)
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

