import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { FundBalance } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function FundBalancesPanel({ balances }: { balances: FundBalance[] }) {
  // Show asset funds prominently. Income / expense funds are accumulators, not
  // balances you'd spend, so show them separately.
  const assets = balances.filter((b) => b.kind === "asset");
  const others = balances.filter((b) => b.kind !== "asset");

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Fund Balances</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            Every balance derived live from the ledger.
          </p>
        </div>
        <Badge tone="brand">
          {formatCurrency(totalAssets)} total assets
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
            Asset funds
          </div>
          <ul className="mt-2 divide-y divide-border rounded border border-border">
            {assets.map((b) => {
              const negative = b.balance < 0;
              return (
                <li
                  key={b.fund_key}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-2xs"
                >
                  <span className="text-ink-700">{b.label}</span>
                  <span
                    className={cn(
                      "tabular font-medium",
                      negative ? "text-loss-text" : "text-ink-900"
                    )}
                  >
                    {formatCurrency(b.balance)}
                  </span>
                </li>
              );
            })}
            {assets.length === 0 && (
              <li className="px-3 py-2 text-3xs text-ink-500">
                No asset funds yet.
              </li>
            )}
          </ul>
        </div>

        {others.length > 0 && (
          <div>
            <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
              Income & expense accumulators
            </div>
            <ul className="mt-2 divide-y divide-border rounded border border-border">
              {others.map((b) => (
                <li
                  key={b.fund_key}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-2xs"
                >
                  <span className="text-ink-700">
                    {b.label}{" "}
                    <span className="text-3xs text-ink-400">
                      ({b.kind})
                    </span>
                  </span>
                  <span className="tabular font-medium text-ink-900">
                    {formatCurrency(b.balance)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
