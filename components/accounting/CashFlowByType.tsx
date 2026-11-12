"use client";

import * as React from "react";
import { Building2, User } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AccountingTransaction, Account } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function CashFlowByType({
  transactions,
  accounts,
}: {
  transactions: AccountingTransaction[];
  accounts: Account[];
}) {
  const accountTypeById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.account_type);
    return m;
  }, [accounts]);

  const buckets = React.useMemo(() => {
    const out = {
      MAVEN: { income: 0, expenses: 0, count: 0 },
      PERSONAL: { income: 0, expenses: 0, count: 0 },
      UNATTRIBUTED: { income: 0, expenses: 0, count: 0 },
    };
    for (const t of transactions) {
      if (t.reversed_by) continue;
      
      const accId = t.account_id ?? null;
      const type = accId ? accountTypeById.get(accId) ?? "UNATTRIBUTED" : "UNATTRIBUTED";
      
      const bucket =
        type === "MAVEN"
          ? out.MAVEN
          : type === "PERSONAL"
            ? out.PERSONAL
            : out.UNATTRIBUTED;
            
      const amount = Number(t.amount_usd);
      
      if (
        t.kind === "withdrawal_received" ||
        t.kind === "income" ||
        t.kind === "refund"
      ) {
        bucket.income += amount;
      } else if (t.kind === "expense" || t.kind === "account_purchase") {
        bucket.expenses += amount;
      }
      
      // Exclude internal transfers and allocations from external activity counts
      if (t.kind !== "allocation" && t.kind !== "transfer" && t.kind !== "owner_contribution") {
        bucket.count += 1;
      }
    }
    return out;
  }, [transactions, accountTypeById]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow by Account Type</CardTitle>
        <Badge tone="neutral">This period</Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <Row
          icon={<SafeIcon kind="maven" />}
          label="Prop Firm Accounts"
          income={buckets.MAVEN.income}
          expenses={buckets.MAVEN.expenses}
          count={buckets.MAVEN.count}
        />
        <Row
          icon={<SafeIcon kind="personal" />}
          label="Personal Capital"
          income={buckets.PERSONAL.income}
          expenses={buckets.PERSONAL.expenses}
          count={buckets.PERSONAL.count}
        />
        {buckets.UNATTRIBUTED.count > 0 && (
          <Row
            icon={<span className="h-3.5 w-3.5" />}
            label="Unassigned / Business Operations"
            income={buckets.UNATTRIBUTED.income}
            expenses={buckets.UNATTRIBUTED.expenses}
            count={buckets.UNATTRIBUTED.count}
          />
        )}
      </CardBody>
    </Card>
  );
}

function Row({
  icon,
  label,
  income,
  expenses,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  income: number;
  expenses: number;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface-soft px-3 py-2 text-2xs">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-ink-900">{label}</span>
        <span className="text-3xs text-ink-500">
          {count} transaction{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>
          <span className="text-ink-500">In: </span>
          <span className="tabular font-semibold text-profit-text">
            {formatCurrency(income)}
          </span>
        </span>
        <span>
          <span className="text-ink-500">Out: </span>
          <span className="tabular font-semibold text-loss-text">
            {formatCurrency(expenses)}
          </span>
        </span>
      </div>
    </div>
  );
}

function SafeIcon({ kind }: { kind: "maven" | "personal" }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <span className="block h-3.5 w-3.5" aria-hidden="true" />;
  if (kind === "maven") return <Building2 className="h-3.5 w-3.5 text-brand-600" />;
  return <User className="h-3.5 w-3.5 text-profit-text" />;
}
