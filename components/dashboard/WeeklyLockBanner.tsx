"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck, Lock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getWeeklyLockStatus, type WeeklyLockStatus } from "@/lib/data/weekly-lock";
import { createClient } from "@/lib/supabase/client";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { formatDateMedium } from "@/lib/utils";

export function WeeklyLockBanner() {
  const { currentAccount } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const [status, setStatus] = React.useState<WeeklyLockStatus | null>(null);

  React.useEffect(() => {
    if (!currentAccount) return;
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const s = await getWeeklyLockStatus(supabase, user.id);
        if (!cancelled) setStatus(s);
      } catch (e) {
        console.error(e);
      }
    }
    
    void load();
    // Refresh every minute to catch midnight rollovers
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentAccount, supabase]);

  if (!status) return null;

  if (status.isLocked) {
    return (
      <div className="rounded-lg border border-loss-border bg-loss-bg p-4 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-loss text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-loss-text uppercase tracking-wide">
                Weekly Trading Locked
              </div>
              <div className="mt-0.5 text-2xs text-loss-text">
                You have reached the maximum of 2 losses this week.
                Your trading authorization is suspended until Monday.
              </div>
            </div>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <div className="text-3xs uppercase tracking-wide text-loss-text">Eligibility Returns</div>
            <div className="tabular text-sm font-semibold text-loss-text">
              {formatDateMedium(new Date(status.resetTime))} at 00:00 EAT
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-profit-text" />
          <div>
            <div className="text-2xs font-semibold text-ink-900">Weekly Trading Status</div>
            <div className="text-3xs text-ink-500">Resets Monday at 00:00 EAT</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-3xs text-ink-500 uppercase tracking-wide">Losses</span>
            <Badge tone={status.lossCount === 1 ? "warn" : "profit"}>
              {status.lossCount} / 2
            </Badge>
          </div>
          <div className="text-3xs text-ink-600">
            {2 - status.lossCount} loss allowance remaining
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
