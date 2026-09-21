import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklyReview } from "@/lib/types";

export async function getWeeklyReview(
  supabase: SupabaseClient,
  accountId: string,
  weekStart: string
): Promise<WeeklyReview | null> {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select("*")
    .eq("account_id", accountId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  return (data as WeeklyReview | null) ?? null;
}

export interface WeeklyReviewUpsert {
  account_id: string;
  week_start: string;
  week_end: string;
  went_well?: string | null;
  went_wrong?: string | null;
  to_improve?: string | null;
  key_lesson?: string | null;
  notes?: string | null;
}

export async function upsertWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  values: WeeklyReviewUpsert
): Promise<WeeklyReview> {
  const { data, error } = await supabase
    .from("weekly_reviews")
    .upsert(
      { ...values, user_id: userId },
      { onConflict: "account_id,week_start" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as WeeklyReview;
}
