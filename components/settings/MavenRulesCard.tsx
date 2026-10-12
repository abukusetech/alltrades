"use client";

import * as React from "react";
import { Building2, Shield, ExternalLink } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BlockLoader } from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import { getActiveMavenRuleVersion } from "@/lib/data/maven-rules";
import { useCurrentAccount } from "@/components/layout/AppShell";
import type { MavenRuleVersion } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function MavenRulesCard() {
  const { currentAccount, accounts } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const [version, setVersion] = React.useState<MavenRuleVersion | null>(null);
  const [loading, setLoading] = React.useState(true);

  const hasMavenAccount = accounts.some((a) => a.account_type === "MAVEN");

  React.useEffect(() => {
    if (!hasMavenAccount) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const v = await getActiveMavenRuleVersion(supabase, user.id);
        setVersion(v);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, hasMavenAccount]);

  if (!hasMavenAccount) return null;
  if (loading) {
    return (
      <Card>
        <CardBody className="py-6">
          <BlockLoader label="Loading Maven rules" />
        </CardBody>
      </Card>
    );
  }

  if (!version) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600" />
            <CardTitle>Maven Instant Funding Rules</CardTitle>
          </div>
          <Badge tone="warn">Not configured</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-2xs text-ink-500">
            No Maven rule version found. Run the Phase 18A migration to seed
            the default Instant Funding rules.
          </p>
        </CardBody>
      </Card>
    );
  }

  const r = version.rules;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-600" />
          <CardTitle>Maven Instant Funding Rules</CardTitle>
        </div>
        <Badge tone="brand">{version.version_label}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-3xs text-brand-800">
          Firm rules are versioned and never mixed with your Personal Trading
          Plan. Rules below are the published values from the current program
          documentation.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Row
            label="Daily drawdown"
            value={formatPercent(r.daily_drawdown_percent, 0)}
            hint={`Resets ${r.daily_reset_time_utc} UTC`}
          />
          <Row
            label="Trailing drawdown"
            value={formatPercent(r.max_trailing_drawdown_percent, 0)}
            hint="From highest equity watermark"
          />
          <Row
            label="Floating loss"
            value={formatPercent(r.max_floating_loss_percent, 0)}
          />
          <Row
            label="Risk per trade"
            value={formatPercent(r.max_risk_per_trade_percent, 0)}
          />
          <Row
            label="Min payout profit"
            value={formatPercent(r.min_payout_profit_percent, 0)}
          />
          <Row
            label="Consistency max"
            value={formatPercent(r.consistency_max_percent, 0)}
          />
          <Row
            label="Profit split"
            value={`${r.trader_profit_share_percent}/${r.firm_profit_share_percent}`}
          />
          <Row
            label="30-day withdrawal cap"
            value={formatCurrency(r.max_withdrawal_per_30d)}
          />
          <Row
            label="Payout processing"
            value={`${r.payout_processing_days} business day${r.payout_processing_days > 1 ? "s" : ""}`}
          />
          <Row
            label="Account reset after payout"
            value={r.account_resets_after_payout ? "Yes" : "No"}
          />
          <Row label="Requires KYC" value={r.require_kyc ? "Yes" : "No"} />
          <Row
            label="Supported sizes"
            value={r.support_account_sizes.map((s) => `$${(s / 1000).toFixed(0)}k`).join(" · ")}
          />
        </div>

        <div className="border-t border-border pt-3 text-3xs text-ink-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Effective from <strong className="text-ink-800">{version.effective_from}</strong>
            </span>
            {version.verified_on && (
              <span>
                · Verified <strong className="text-ink-800">{version.verified_on}</strong>
              </span>
            )}
          </div>
          {version.source_url && (
            <a
              href={version.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-brand-700 hover:underline"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {version.notes && (
            <p className="mt-1 italic text-ink-500">{version.notes}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-border bg-surface-soft px-3 py-2">
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="tabular mt-0.5 text-xs font-semibold text-ink-900">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-3xs text-ink-500">{hint}</div>}
    </div>
  );
}
