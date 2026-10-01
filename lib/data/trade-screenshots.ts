import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradeScreenshot } from "@/lib/types";

export async function listTradeScreenshots(
  supabase: SupabaseClient,
  tradeId: string
): Promise<TradeScreenshot[]> {
  const { data, error } = await supabase
    .from("trade_screenshots")
    .select("*")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[ALLTRADES] listTradeScreenshots failed", error);
    throw error;
  }
  console.log("[ALLTRADES] listTradeScreenshots", {
    tradeId,
    count: data?.length ?? 0,
  });
  return (data ?? []) as TradeScreenshot[];
}

export async function listTradeScreenshotsBulk(
  supabase: SupabaseClient,
  tradeIds: string[]
): Promise<TradeScreenshot[]> {
  if (tradeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("trade_screenshots")
    .select("*")
    .in("trade_id", tradeIds);
  if (error) throw error;
  return (data ?? []) as TradeScreenshot[];
}

export async function addTradeScreenshot(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
  storagePath: string,
  label: "Analysis" | "Before Trade" | "After Trade" = "Analysis"
): Promise<TradeScreenshot> {
  const insertPayload = {
    user_id: userId,
    trade_id: tradeId,
    storage_path: storagePath,
    label,
  };

  console.log("[ALLTRADES] addTradeScreenshot → payload", insertPayload);

  const { data, error } = await supabase
    .from("trade_screenshots")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("[ALLTRADES] addTradeScreenshot FAILED", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload: insertPayload,
    });
    throw new Error(
      `addTradeScreenshot failed [${error.code ?? "no-code"}]: ${error.message}` +
        (error.details ? ` — ${error.details}` : "") +
        (error.hint ? ` (hint: ${error.hint})` : "")
    );
  }

  console.log("[ALLTRADES] addTradeScreenshot ✓ inserted", data);
  return data as TradeScreenshot;
}

export async function removeTradeScreenshot(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("trade_screenshots")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
