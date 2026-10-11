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
  const { data, error } = await supabase
    .from("trade_screenshots")
    .insert({
      user_id: userId,
      trade_id: tradeId,
      storage_path: storagePath,
      label,
    })
    .select("*")
    .single();
  if (error) throw error;

  // Read-back verification: confirms the row is actually visible to the
  // authenticated user under RLS. Catches silent insert failures.
  const { data: verify, error: verifyErr } = await supabase
    .from("trade_screenshots")
    .select("id")
    .eq("id", (data as TradeScreenshot).id)
    .maybeSingle();

  if (verifyErr || !verify) {
    console.error("[ALLTRADES] insert read-back failed", {
      insertedId: (data as TradeScreenshot).id,
      verifyErr,
    });
    throw new Error(
      "Screenshot row was inserted but could not be read back. Check RLS on trade_screenshots."
    );
  }

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
