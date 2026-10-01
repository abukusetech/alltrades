"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { listTrades } from "@/lib/data/trades";
import { formatCurrency } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export function LinkedTradeBanner({
  accountId,
  dailyAnalysisId,
  tradePlanId,
}: {
  accountId: string | null;
  dailyAnalysisId: string | null;
  tradePlanId: string | null;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [trade, setTrade] = React.useState<Trade | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await listTrades(supabase, { accountId });
        const match = rows.find((t) => {
          if (tradePlanId && t.trade_plan_id === tradePlanId) return true;
          if (dailyAnalysisId && t.daily_analysis_id === dailyAnalysisId) return true;
          return false;
        });
        if (!cancelled) setTrade(match ?? null);
      } catch {
        if (!cancelled) setTrade(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, dailyAnalysisId, tradePlanId, supabase]);

  if (loading || !trade) return null;

  const pl = Number(trade.profit_loss) || 0;
  const plClass =
    pl > 0 ? "text-profit-text" : pl < 0 ? "text-loss-text" : "text-ink-700";
  const tone =
    trade.result === "Win" ? "profit" : trade.result === "Loss" ? "loss" : "neutral";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-brand-700" />
        <div>
          <div className="text-2xs font-semibold text-brand-800">
            Linked Trade recorded
          </div>
          <div className="text-3xs text-brand-700">
            {trade.instrument} · {trade.trade_date} ·{" "}
            <Badge tone={tone}>{trade.result}</Badge>{" "}
            <span className={`tabular font-medium ${plClass}`}>
              {formatCurrency(pl, { showSign: true })}
            </span>
          </div>
        </div>
      </div>
      <Link href={`/journal?trade=${trade.id}`}>
        <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
          Open in Journal
        </Button>
      </Link>
    </div>
  );
}
