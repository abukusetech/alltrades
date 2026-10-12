import type { SupabaseClient } from "@supabase/supabase-js";
import type { MavenRuleVersion } from "@/lib/types";

export async function getActiveMavenRuleVersion(
  supabase: SupabaseClient,
  userId: string
): Promise<MavenRuleVersion | null> {
  const { data, error } = await supabase
    .from("maven_rule_versions")
    .select("*")
    .eq("user_id", userId)
    .lte("effective_from", new Date().toISOString().slice(0, 10))
    .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as MavenRuleVersion | null) ?? null;
}

export async function getMavenRuleVersionById(
  supabase: SupabaseClient,
  id: string
): Promise<MavenRuleVersion | null> {
  const { data, error } = await supabase
    .from("maven_rule_versions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as MavenRuleVersion | null) ?? null;
}

export async function listMavenRuleVersions(
  supabase: SupabaseClient,
  userId: string
): Promise<MavenRuleVersion[]> {
  const { data, error } = await supabase
    .from("maven_rule_versions")
    .select("*")
    .eq("user_id", userId)
    .order("effective_from", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MavenRuleVersion[];
}

export async function createMavenRuleVersion(
  supabase: SupabaseClient,
  userId: string,
  values: Omit<MavenRuleVersion, "id" | "user_id" | "created_at">
): Promise<MavenRuleVersion> {
  const { data, error } = await supabase
    .from("maven_rule_versions")
    .insert({ ...values, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as MavenRuleVersion;
}
