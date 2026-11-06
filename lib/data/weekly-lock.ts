import type { SupabaseClient } from "@supabase/supabase-js";
import { getNetPnL } from "@/lib/calc";
import type { Trade } from "@/lib/types";

export interface WeeklyLockStatus {
  weekStart: string;
  lossCount: number;
  isLocked: boolean;
  resetTime: string; // ISO string for next Monday 00:00 EAT
  losingTrades: Trade[];
}

/**
 * Calculates the current week's lock status based on actual journal trades.
 * Week runs Monday 00:00 to Sunday 23:59:59 in Africa/Nairobi.
 */
export async function getWeeklyLockStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyLockStatus> {
  // 1. Calculate start and end of current week in Africa/Nairobi
  const now = new Date();
  // EAT is UTC+3. We offset the date to calculate week boundaries safely.
  const eatOffsetMs = 3 * 60 * 60 * 1000;
  const nowEat = new Date(now.getTime() + eatOffsetMs);
  
  const dayOfWeek = nowEat.getUTCDay(); // 0 = Sunday, 1 = Monday
  const diffToMonday = (dayOfWeek + 6) % 7;
  
  const startOfWeekEat = new Date(nowEat);
  startOfWeekEat.setUTCDate(nowEat.getUTCDate() - diffToMonday);
  startOfWeekEat.setUTCHours(0, 0, 0, 0);
  
  // Convert back to UTC for the DB query
  const weekStartUtc = new Date(startOfWeekEat.getTime() - eatOffsetMs);
  const weekStartStr = weekStartUtc.toISOString().split("T")[0];
  
  const nextMondayEat = new Date(startOfWeekEat);
  nextMondayEat.setUTCDate(startOfWeekEat.getUTCDate() + 7);
  const nextMondayUtc = new Date(nextMondayEat.getTime() - eatOffsetMs);

  // 2. Fetch all trades for this week
  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .gte("trade_date", weekStartStr)
    .order("trade_date", { ascending: true });

  if (error) throw error;

  // 3. Find net-negative trades (losses)
  const losingTrades = (trades as Trade[]).filter(
    (t) => getNetPnL(t) < 0 && t.result !== "Breakeven"
  );

  const lossCount = losingTrades.length;
  const isLocked = lossCount >= 2;

  return {
    weekStart: weekStartStr,
    lossCount,
    isLocked,
    resetTime: nextMondayUtc.toISOString(),
    losingTrades,
  };
}
