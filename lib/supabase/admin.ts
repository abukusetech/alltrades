import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 * This bypasses RLS — use ONLY in API routes and server actions.
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local and Vercel env vars."
    );
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
