import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  try {
    // 1. Verify the caller is signed in
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const admin = createAdminClient();

    // 2. Remove all storage files owned by this user.
    //    Files live under `<user_id>/...` in the trade-screenshots bucket.
    try {
      const { data: listed, error: listError } = await admin.storage
        .from("trade-screenshots")
        .list(userId, { limit: 1000 });

      if (listError) {
        // eslint-disable-next-line no-console
        console.warn("[ALLTRADES] storage list failed", listError);
      }

      if (listed && listed.length > 0) {
        // Recursively gather all files under this user's folder
        const paths: string[] = [];

        async function walk(prefix: string) {
          const { data, error } = await admin.storage
            .from("trade-screenshots")
            .list(prefix, { limit: 1000 });
          if (error || !data) return;
          for (const item of data) {
            const full = `${prefix}/${item.name}`;
            if (item.id === null) {
              // It's a folder
              await walk(full);
            } else {
              paths.push(full);
            }
          }
        }

        await walk(userId);

        if (paths.length > 0) {
          const { error: removeError } = await admin.storage
            .from("trade-screenshots")
            .remove(paths);
          if (removeError) {
            // eslint-disable-next-line no-console
            console.warn("[ALLTRADES] storage remove failed", removeError);
          }
        }
      }
    } catch (e) {
      // Storage cleanup is best-effort — deletion still proceeds
      // eslint-disable-next-line no-console
      console.warn("[ALLTRADES] storage cleanup error", e);
    }

    // 3. Delete the auth user.
    //    Cascade FKs remove profiles, accounts, trades, analyses,
    //    withdrawals, weekly_reviews, account_daily_snapshots,
    //    trade_screenshots, analysis_screenshots, system_settings.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // eslint-disable-next-line no-console
      console.error("[ALLTRADES] deleteUser failed", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Unexpected error during deletion";
    // eslint-disable-next-line no-console
    console.error("[ALLTRADES] delete account error", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
