import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account, Profile } from "@/lib/types";

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function getAccounts(
  supabase: SupabaseClient,
  userId: string
): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Account[];
}

export async function getAccount(
  supabase: SupabaseClient,
  id: string
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Account | null) ?? null;
}

export interface AccountInsert {
  name: string;
  starting_capital: number;
  notes?: string | null;
}

export async function createAccount(
  supabase: SupabaseClient,
  userId: string,
  values: AccountInsert
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: values.name,
      starting_capital: values.starting_capital,
      notes: values.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Account;
}

export interface AccountUpdate {
  name?: string;
  notes?: string | null;
  is_active?: boolean;
}

export async function updateAccount(
  supabase: SupabaseClient,
  id: string,
  values: AccountUpdate
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Account;
}

export async function deleteAccount(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
