import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanMilestone, PlanHistoryEntry, PlanPriority, PlanCategory, PlanStatus } from "@/lib/types";

export async function listPlans(supabase: SupabaseClient, userId: string, includeArchived = false): Promise<Plan[]> {
  let q = supabase.from("plans").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (!includeArchived) q = q.eq("archived", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function listMilestones(supabase: SupabaseClient, userId: string, planId: string): Promise<PlanMilestone[]> {
  const { data, error } = await supabase
    .from("plan_milestones")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanMilestone[];
}

export async function listAllMilestones(supabase: SupabaseClient, userId: string): Promise<PlanMilestone[]> {
  const { data, error } = await supabase
    .from("plan_milestones")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanMilestone[];
}

export interface PlanInsert {
  title: string;
  description?: string | null;
  category: PlanCategory;
  priority: PlanPriority;
  starting_value?: number | null;
  current_value?: number | null;
  target_value?: number | null;
  start_date: string;
  deadline?: string | null;
  status?: PlanStatus;
  notes?: string | null;
  manual_progress?: number | null;
}

export async function createPlan(supabase: SupabaseClient, userId: string, values: PlanInsert): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .insert({ ...values, user_id: userId, status: values.status ?? "not_started" })
    .select("*")
    .single();
  if (error) throw error;
  await logHistory(supabase, userId, (data as Plan).id, "created", { title: values.title });
  return data as Plan;
}

export async function updatePlan(supabase: SupabaseClient, userId: string, id: string, values: Partial<Plan>): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  await logHistory(supabase, userId, id, "updated", values);
  return data as Plan;
}

export async function deletePlan(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function createMilestone(supabase: SupabaseClient, userId: string, planId: string, values: { title: string; description?: string | null; due_date?: string | null }): Promise<PlanMilestone> {
  const { data: existing } = await supabase.from("plan_milestones").select("sort_order").eq("plan_id", planId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sort_order = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("plan_milestones")
    .insert({ ...values, plan_id: planId, user_id: userId, sort_order })
    .select("*")
    .single();
  if (error) throw error;
  return data as PlanMilestone;
}

export async function toggleMilestone(supabase: SupabaseClient, userId: string, milestoneId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from("plan_milestones")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", milestoneId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteMilestone(supabase: SupabaseClient, userId: string, milestoneId: string): Promise<void> {
  const { error } = await supabase.from("plan_milestones").delete().eq("id", milestoneId).eq("user_id", userId);
  if (error) throw error;
}

async function logHistory(supabase: SupabaseClient, userId: string, planId: string, action: string, details?: Record<string, unknown>) {
  try {
    await supabase.from("plan_history").insert({ plan_id: planId, user_id: userId, action, details: details ?? null });
  } catch {
    // Best effort
  }
}

export async function listPlanHistory(supabase: SupabaseClient, userId: string, planId: string): Promise<PlanHistoryEntry[]> {
  const { data, error } = await supabase.from("plan_history").select("*").eq("user_id", userId).eq("plan_id", planId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlanHistoryEntry[];
}
