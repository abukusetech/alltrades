import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trade } from "@/lib/types";

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

export type TradeInsert = Omit<
  Trade,
  "id" | "user_id" | "created_at" | "updated_at"
>;
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
