import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getProfile } from "@/lib/data/accounts";
import { AppShell } from "@/components/layout/AppShell";
import { SWRProvider } from "@/components/providers/SWRProvider";
import type { Account, Profile } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, accounts] = await Promise.all([
    getProfile(supabase, user.id).catch(() => null),
    getAccounts(supabase, user.id).catch(() => [] as Account[]),
  ]);

  const safeProfile: Profile | null =
    profile ?? {
      id: user.id,
      email: user.email ?? "",
      full_name:
        (user.user_metadata?.full_name as string | undefined) ?? null,
      created_at: user.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  return (
    <SWRProvider>
      <AppShell profile={safeProfile} accounts={accounts}>
        {children}
      </AppShell>
    </SWRProvider>
  );
}
