"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Search,
  RotateCcw,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AccountingTransaction } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const KIND_LABELS: Record<string, string> = {
  withdrawal_received: "Withdrawal",
  allocation: "Allocation",
  account_purchase: "Account purchase",
  transfer: "Transfer",
  expense: "Expense",
  income: "Income",
  savings_deposit: "Savings deposit",
  refund: "Refund",
  correction: "Correction",\n  owner_contribution: "Owner funding",
};

const KIND_TONE: Record<string, "profit" | "loss" | "neutral" | "warn" | "brand"> = {
  withdrawal_received: "profit",
  allocation: "brand",
  account_purchase: "loss",
  transfer: "neutral",
  expense: "loss",
  income: "profit",
  savings_deposit: "brand",
  refund: "profit",
  correction: "warn",
};

type SortKey = "occurred_on" | "amount_usd" | "kind";

export function TransactionLedger({
  transactions,
  onReverse,
  onEdit,
  onDelete,
}: {
  transactions: AccountingTransaction[];
  onReverse: (t: AccountingTransaction) => void;
  onEdit: (t: AccountingTransaction) => void;
  onDelete: (t: AccountingTransaction) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState("All kinds");
  const [sortKey, setSortKey] = React.useState<SortKey>("occurred_on");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [showReversed, setShowReversed] = React.useState(false);

  const kindOptions = React.useMemo(() => {
    const set = new Set(transactions.map((t) => t.kind));
    return ["All kinds", ...Array.from(set)];
  }, [transactions]);

  // Hide auto-generated reversal rows by default — they clutter the view.
  // They reappear if the user toggles "show reversed".
  const autoReversals = React.useMemo(() => {
    return new Set(
      transactions
        .filter((t) => t.kind === "correction" && t.description?.startsWith("Original reversed"))
        .map((t) => t.id)
    );
  }, [transactions]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = transactions;

    if (!showReversed) {
      rows = rows.filter((t) => !t.reversed_by && !autoReversals.has(t.id));
    }

    if (q) {
      rows = rows.filter((t) =>
        [t.description, t.reference, t.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (kindFilter !== "All kinds") {
      rows = rows.filter((t) => t.kind === kindFilter);
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "amount_usd") {
        return (Number(a.amount_usd) - Number(b.amount_usd)) * dir;
      }
      if (sortKey === "kind") {
        return a.kind.localeCompare(b.kind) * dir;
      }
      return a.occurred_on.localeCompare(b.occurred_on) * dir;
    });
  }, [transactions, search, kindFilter, sortKey, sortDir, showReversed, autoReversals]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Record your first income, expense, transfer or withdrawal to begin tracking your finances."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, reference, notes…"
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-400 hover:bg-ink-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          options={kindOptions}
          className="w-full sm:w-auto sm:max-w-[180px]"
        />
        <button
          type="button"
          onClick={() => setShowReversed((v) => !v)}
          className={cn(
            "whitespace-nowrap rounded border px-2 py-1 text-3xs transition-colors",
            showReversed
              ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
              : "border-border text-ink-600 hover:bg-surface-muted"
          )}
        >
          {showReversed ? "Hide reversed" : "Show reversed"}
        </button>
      </div>

      <TableWrap>
        <Table>
          <THead>
            <tr>
              <SortableTH
                label="Date"
                onClick={() => toggleSort("occurred_on")}
                active={sortKey === "occurred_on"}
                dir={sortDir}
              />
              <SortableTH
                label="Kind"
                onClick={() => toggleSort("kind")}
                active={sortKey === "kind"}
                dir={sortDir}
              />
              <TH>Description</TH>
              <SortableTH
                label="Amount"
                onClick={() => toggleSort("amount_usd")}
                active={sortKey === "amount_usd"}
                dir={sortDir}
                className="text-right"
              />
              <TH>Reference</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {filtered.map((t) => {
              const reversed = !!t.reversed_by;
              const isReplacement = !!t.reverses && t.kind !== "correction";
              const isAutoReversal =
                t.kind === "correction" &&
                (t.description?.startsWith("Original reversed") ?? false);

              // Delete rules:
              // - Standalone → deletable
              // - Replacement → deletable (collapses the whole chain)
              // - Original reversed → NOT deletable (delete replacement instead)
              // - Auto reversal row → NOT deletable (hidden by default)
              const canDelete =
                !reversed && !isAutoReversal;

              return (
                <TR
                  key={t.id}
                  className={cn(
                    reversed && "opacity-50",
                    isAutoReversal && "bg-surface-soft"
                  )}
                >
                  <TD>{t.occurred_on}</TD>
                  <TD>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={KIND_TONE[t.kind] ?? "neutral"}>
                        {KIND_LABELS[t.kind] ?? t.kind}
                      </Badge>
                      {isReplacement && <Badge tone="warn">Amended</Badge>}
                      {isAutoReversal && <Badge tone="neutral">Reversal</Badge>}
                      {reversed && !isAutoReversal && (
                        <Badge tone="neutral">Reversed</Badge>
                      )}
                    </div>
                  </TD>
                  <TD
                    className={cn(
                      "max-w-[320px] truncate",
                      reversed && "line-through"
                    )}
                  >
                    {t.description}
                  </TD>
                  <TD
                    className={cn(
                      "tabular text-right font-semibold",
                      reversed && "line-through",
                      t.kind === "expense" ||
                        t.kind === "account_purchase" ||
                        t.kind === "savings_deposit"
                        ? "text-loss-text"
                        : t.kind === "income" ||
                            t.kind === "withdrawal_received" ||
                            t.kind === "refund" ||
                            t.kind === "owner_contribution"
                          ? "text-profit-text"
                          : "text-ink-900"
                    )}
                  >
                    {formatCurrency(t.kind === "account_purchase" || t.kind === "expense" ? -Number(t.amount_usd) : Number(t.amount_usd), { showSign: true })}
                  </TD>
                  <TD className="text-3xs text-ink-500">{t.reference ?? "—"}</TD>
                  <TD className="text-right">
                    {!reversed && !isAutoReversal ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(t)}
                          leftIcon={<Pencil className="h-3 w-3" />}
                        >
                          Edit
                        </Button>
                        {!isReplacement && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReverse(t)}
                            leftIcon={<RotateCcw className="h-3 w-3" />}
                          >
                            Reverse
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(t)}
                            className="text-loss-text hover:bg-loss-bg"
                            leftIcon={<Trash2 className="h-3 w-3" />}
                          >
                            {isReplacement ? "Delete correction" : "Delete"}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-3xs text-ink-400">
                        {isAutoReversal ? "Auto-generated" : "Reversed"}
                      </span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableWrap>
    </div>
  );
}

function SortableTH({
  label,
  onClick,
  active,
  dir,
  className,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  className?: string;
}) {
  return (
    <TH className={className}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-ink-700"
      >
        {label}
        {active && (
          <span className="text-3xs text-ink-500">
            {dir === "asc" ? (
              <ArrowUp className="inline h-3 w-3" />
            ) : (
              <ArrowDown className="inline h-3 w-3" />
            )}
          </span>
        )}
      </button>
    </TH>
  );
}


