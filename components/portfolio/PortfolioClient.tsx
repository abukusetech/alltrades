"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockLoader } from "@/components/ui/Spinner";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export function PortfolioClient() {
  const { accounts } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);

  const [rows, setRows] = React.useState<
    { accountId: string; name: string; starting: number; current: number; trades: number; pnl: number; drawdownPercent: number }[]
  >([]);
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
          starting > 0 ? ((starting - current) / starting) * 100 : 0;

        return {
          accountId: a.id,
          name: a.name,
          starting,
          current,
          trades: (trades ?? []).length,
          pnl,
          drawdownPercent: Math.max(drawdownPercent, 0),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Every funded account at a glance."
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
        <Card>
          <CardHeader>
            <CardTitle>Your Accounts</CardTitle>
            <Badge tone="neutral">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </Badge>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Account</th>
                    <th className="px-4 py-2 text-right font-medium">Size</th>
                    <th className="px-4 py-2 text-right font-medium">Current</th>
                    <th className="px-4 py-2 text-right font-medium">P/L</th>
                    <th className="px-4 py-2 text-right font-medium">Drawdown</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
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
                        <td className="px-4 py-2.5 text-xs font-medium text-ink-900">
                          {r.name}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                          {formatCurrency(r.starting)}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-xs font-semibold text-ink-900">
                          {formatCurrency(r.current)}
                        </td>
                        <td className={cn("tabular px-4 py-2.5 text-right text-xs font-semibold", pnlClass)}>
                          {formatCurrency(r.pnl, { showSign: true })}
                        </td>
                        <td className="tabular px-4 py-2.5 text-right text-xs text-ink-700">
                          {formatPercent(r.drawdownPercent, 2)}
                        </td>
                        <td className="px-4 py-2.5">
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
          </CardBody>
        </Card>
      )}
    </div>
  );
}
