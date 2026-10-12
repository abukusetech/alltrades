"use client";

import * as React from "react";
import { Layers, Building2, User } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockLoader } from "@/components/ui/Spinner";
import { accountTypeLabel, accountTypeTone } from "@/lib/accounts/rules";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { AccountType } from "@/lib/types";

interface Row {
  accountId: string;
  name: string;
  account_type: AccountType;
  starting: number;
  current: number;
  trades: number;
  pnl: number;
  drawdownPercent: number;
}

export function PortfolioClient() {
  const { accounts, filterMode } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (accounts.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all(
      accounts.map(async (a) => {
        const { data: trades } = await supabase
          .from("trades")
          .select("profit_loss, trade_date")
          .eq("account_id", a.id);
        const { data: withdrawals } = await supabase
          .from("withdrawals")
          .select("amount")
          .eq("account_id", a.id);

        const starting = Number(a.starting_capital) || 0;
        const pnl = (trades ?? []).reduce(
          (s, t) => s + (Number(t.profit_loss) || 0),
          0
        );
        const wd = (withdrawals ?? []).reduce(
          (s, w) => s + (Number(w.amount) || 0),
          0
        );
        const current = starting + pnl - wd;
        const drawdownPercent =
          starting > 0 ? Math.max(((starting - current) / starting) * 100, 0) : 0;

        return {
          accountId: a.id,
          name: a.name,
          account_type: a.account_type,
          starting,
          current,
          trades: (trades ?? []).length,
          pnl,
          drawdownPercent,
        };
      })
    )
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accounts, supabase]);

  // Split Maven vs Personal
  const mavenRows = rows.filter((r) => r.account_type === "MAVEN");
  const personalRows = rows.filter((r) => r.account_type === "PERSONAL");
  const unclassifiedRows = rows.filter((r) => r.account_type === "UNCLASSIFIED");

  const showMaven = filterMode === "ALL" || filterMode === "MAVEN";
  const showPersonal = filterMode === "ALL" || filterMode === "PERSONAL";
  const showUnclassified =
    filterMode === "ALL" && unclassifiedRows.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Every funded account at a glance, separated by type."
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-4 w-4" />}
          title="No accounts yet"
          description="Create accounts in Settings to see them here."
        />
      ) : loading ? (
        <BlockLoader label="Loading portfolio" />
      ) : (
        <div className="space-y-6">
          {showMaven && (
            <Section
              title="Maven Prop Firm"
              icon={<Building2 className="h-4 w-4 text-brand-600" />}
              rows={mavenRows}
              emptyMessage="No Maven accounts yet."
            />
          )}
          {showPersonal && (
            <Section
              title="Personal Capital"
              icon={<User className="h-4 w-4 text-profit-text" />}
              rows={personalRows}
              emptyMessage="No personal accounts yet."
            />
          )}
          {showUnclassified && (
            <Section
              title="Unclassified"
              icon={<Layers className="h-4 w-4 text-warn-text" />}
              rows={unclassifiedRows}
              emptyMessage="Nothing unclassified."
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  rows,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Row[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <Badge tone="neutral">
          {rows.length} {rows.length === 1 ? "account" : "accounts"}
        </Badge>
      </CardHeader>
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-2xs text-ink-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium sm:px-4">Account</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">Size</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">Current</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">P/L</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">Drawdown</th>
                  <th className="px-3 py-2 text-left font-medium sm:px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const pnlClass =
                    r.pnl > 0
                      ? "text-profit-text"
                      : r.pnl < 0
                        ? "text-loss-text"
                        : "text-ink-700";
                  const active = r.drawdownPercent < 2;
                  return (
                    <tr key={r.accountId} className="hover:bg-surface-soft">
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-ink-900">
                            {r.name}
                          </span>
                          <Badge tone={accountTypeTone(r.account_type)}>
                            {accountTypeLabel(r.account_type)}
                          </Badge>
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-xs text-ink-700 sm:px-4">
                        {formatCurrency(r.starting)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-xs font-semibold text-ink-900 sm:px-4">
                        {formatCurrency(r.current)}
                      </td>
                      <td
                        className={cn(
                          "tabular px-3 py-2.5 text-right text-xs font-semibold sm:px-4",
                          pnlClass
                        )}
                      >
                        {formatCurrency(r.pnl, { showSign: true })}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-xs text-ink-700 sm:px-4">
                        {formatPercent(r.drawdownPercent, 2)}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <Badge tone={active ? "profit" : "loss"}>
                          {active ? "Active" : "At risk"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
