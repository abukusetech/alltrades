import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trade, RuleCheck } from "@/lib/types";

export interface TradeFilters {
  accountId: string;
  search?: string;
  instrument?: string;
  result?: string;
  strategy?: string;
  fromDate?: string;
  toDate?: string;
}

export async function listTrades(
  supabase: SupabaseClient,
  filters: TradeFilters
): Promise<Trade[]> {
  let query = supabase
    .from("trades")
    .select("*")
    .eq("account_id", filters.accountId)
    .order("trade_date", { ascending: false })
    .order("trade_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.instrument && filters.instrument !== "All instruments") {
    query = query.eq("instrument", filters.instrument);
  }
  if (filters.result && filters.result !== "All results") {
    query = query.eq("result", filters.result);
  }
  if (filters.strategy && filters.strategy !== "All strategies") {
    query = query.eq("strategy", filters.strategy);
  }
  if (filters.fromDate) query = query.gte("trade_date", filters.fromDate);
  if (filters.toDate) query = query.lte("trade_date", filters.toDate);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as Trade[];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((t) => {
      const haystack = [
        t.instrument,
        t.strategy,
        t.setup_type,
        t.notes,
        t.entry_reason,
        t.exit_reason,
        t.emotions,
        t.mistakes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  return rows;
}

export async function getTrade(
  supabase: SupabaseClient,
  id: string
): Promise<Trade | null> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Trade | null) ?? null;
}

/**
 * Every existing Trade field is required by default.
 * Phase 9 fields are all optional so existing call sites keep compiling.
 */
export type TradeInsert = Omit<
  Trade,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "what_went_well"
  | "market_observation"
  | "lesson"
  | "mistake_tags"
  | "daily_analysis_id"
  | "trade_plan_id"
  | "entry_tags"
  | "exit_tags"
  | "management_tags"
  | "well_tags"
  | "emotion_before_tags"
  | "emotion_after_tags"
  | "market_tags"
  | "lesson_tags"
  | "rule_compliance"
  | "rule_pass_count"
  | "rule_total_count"
  | "rule_pass"
> & {
  what_went_well?: string | null;
  market_observation?: string | null;
  lesson?: string | null;
  mistake_tags?: string[] | null;
  daily_analysis_id?: string | null;
  trade_plan_id?: string | null;
  entry_tags?: string[] | null;
  exit_tags?: string[] | null;
  management_tags?: string[] | null;
  well_tags?: string[] | null;
  emotion_before_tags?: string[] | null;
  emotion_after_tags?: string[] | null;
  market_tags?: string[] | null;
  lesson_tags?: string[] | null;
  rule_compliance?: RuleCheck[] | null;
  rule_pass_count?: number | null;
  rule_total_count?: number | null;
  rule_pass?: boolean | null;
};

export type TradeUpdate = Partial<TradeInsert>;

export async function createTrade(
  supabase: SupabaseClient,
  userId: string,
  values: TradeInsert
): Promise<Trade> {
  const { data, error } = await supabase
    .from("trades")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Trade;
}

export async function updateTrade(
  supabase: SupabaseClient,
  id: string,
  values: TradeUpdate
): Promise<Trade> {
  const { data, error } = await supabase
    .from("trades")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Trade;
}

export async function deleteTrade(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}
