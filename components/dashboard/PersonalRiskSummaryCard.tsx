"use client";

import * as React from "react";
import Link from "next/link";
import { User, ArrowUpRight, Target, Shield } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getActivePersonalPlan } from "@/lib/data/personal-plans";
import type { Account, PersonalTradingPlan } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function PersonalRiskSummaryCard({ account }: { account: Account }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [plan, setPlan] = React.useState<PersonalTradingPlan | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getActivePersonalPlan(supabase, account.id);
        if (!cancelled) setPlan(p);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account.id, supabase]);

  const capital = Number(account.starting_capital) || 0;
  const pct = (v: number | null | undefined) =>
    v != null ? (capital * v) / 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-profit-text" />
          <CardTitle>Personal Plan</CardTitle>
        </div>
        <Badge tone="profit">Personal Capital</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {loading ? (
          <p className="text-2xs text-ink-500">Loading plan…</p>
        ) : !plan ? (
          <>
            <p className="text-2xs text-ink-500">
              No Personal Trading Plan yet. Configure your risk preferences,
              targets, and strategy.
            </p>
            <Link href="/settings">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                Configure plan
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat
                icon={<Shield className="h-3.5 w-3.5 text-brand-600" />}
                label="Default risk"
                value={
                  plan.default_risk_percent != null
                    ? `${formatPercent(plan.default_risk_percent, 2)} (${formatCurrency(pct(plan.default_risk_percent))})`
                    : "Not configured"
                }
              />
              <Stat
                icon={<Shield className="h-3.5 w-3.5 text-loss-text" />}
                label="Daily loss cap"
                value={
                  plan.max_daily_loss_percent != null
                    ? `${formatPercent(plan.max_daily_loss_percent, 2)} (${formatCurrency(pct(plan.max_daily_loss_percent))})`
                    : "Not configured"
                }
              />
              <Stat
                icon={<Shield className="h-3.5 w-3.5 text-loss-text" />}
                label="Weekly loss cap"
                value={
                  plan.max_weekly_loss_percent != null
                    ? `${formatPercent(plan.max_weekly_loss_percent, 2)} (${formatCurrency(pct(plan.max_weekly_loss_percent))})`
                    : "Not configured"
                }
              />
              <Stat
                icon={<Shield className="h-3.5 w-3.5 text-loss-text" />}
                label="Max drawdown"
                value={
                  plan.max_drawdown_percent != null
                    ? `${formatPercent(plan.max_drawdown_percent, 2)} (${formatCurrency(pct(plan.max_drawdown_percent))})`
                    : "Not configured"
                }
              />
              {plan.daily_target_percent != null && (
                <Stat
                  icon={<Target className="h-3.5 w-3.5 text-profit-text" />}
                  label="Daily target"
                  value={`${formatPercent(plan.daily_target_percent, 2)} (${formatCurrency(pct(plan.daily_target_percent))})`}
                />
              )}
              {plan.min_rr != null && (
                <Stat
                  icon={<Target className="h-3.5 w-3.5 text-brand-600" />}
                  label="Min R:R"
                  value={`1 : ${plan.min_rr.toFixed(2)}`}
                />
              )}
            </div>

            <Link href="/settings">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                Edit plan
              </Button>
            </Link>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-3xs uppercase tracking-wide text-ink-500">
        {icon}
        {label}
      </div>
      <div className="tabular mt-0.5 text-xs font-medium text-ink-900">
        {value}
      </div>
    </div>
  );
}
