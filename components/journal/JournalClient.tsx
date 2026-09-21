"use client";

import * as React from "react";
import { Plus, Search, BookOpen, X } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals, useRevalidateAccount } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table, TableWrap, TBody, TD, TH, THead, TR,
} from "@/components/ui/Table";
import { TradeFormModal } from "./TradeFormModal";
import { TradeDetailModal } from "./TradeDetailModal";
import { INSTRUMENTS, RESULTS, STRATEGIES } from "@/lib/constants";
import type { Trade } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type SortKey = "trade_date" | "profit_loss" | "instrument" | "result";

export function JournalClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: trades = [], isLoading } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const revalidate = useRevalidateAccount(currentAccountId);

  const [search, setSearch] = React.useState("");
  const [instrument, setInstrument] = React.useState("All instruments");
  const [result, setResult] = React.useState("All results");
  const [strategy, setStrategy] = React.useState("All strategies");
  const [sortKey, setSortKey] = React.useState<SortKey>("trade_date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Trade | null>(null);
  const [detail, setDetail] = React.useState<Trade | null>(null);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = trades;
    if (q) {
      rows = rows.filter((t) =>
        [t.instrument, t.strategy, t.setup_type, t.notes, t.entry_reason, t.exit_reason]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    if (instrument !== "All instruments") rows = rows.filter((t) => t.instrument === instrument);
    if (result !== "All results") rows = rows.filter((t) => t.result === result);
    if (strategy !== "All strategies") rows = rows.filter((t) => t.strategy === strategy);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === "profit_loss") return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }, [trades, search, instrument, result, strategy, sortKey, sortDir]);

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(t: Trade) { setDetail(null); setEditing(t); setFormOpen(true); }
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const canAddTrade = !!currentAccount && metrics.weeklyTradeCount < metrics.maxWeeklyTrades;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        subtitle="Every recorded trade for the selected account."
        actions={
          currentAccount ? (
            <Button
              onClick={openNew}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              disabled={!canAddTrade}
              title={!canAddTrade ? `Weekly limit reached (${metrics.maxWeeklyTrades})` : undefined}
            >
              New Trade
            </Button>
          ) : undefined
        }
      />

      {!currentAccount ? (
        <EmptyState title="No account selected" description="Create an account in Settings before recording trades." />
      ) : (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search instrument, strategy, notes…" className="pl-9" />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-ink-400 hover:bg-ink-100">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <Select value={instrument} onChange={(e) => setInstrument(e.target.value)}
                options={["All instruments", ...INSTRUMENTS] as unknown as string[]} />
              <Select value={result} onChange={(e) => setResult(e.target.value)}
                options={["All results", ...RESULTS] as unknown as string[]} />
              <Select value={strategy} onChange={(e) => setStrategy(e.target.value)}
                options={["All strategies", ...STRATEGIES] as unknown as string[]} />
            </div>
          </div>

          {isLoading && trades.length === 0 ? (
            <BlockLoader label="Loading trades" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-4 w-4" />}
              title={trades.length === 0 ? "No trades recorded" : "No trades match your filters"}
              description={trades.length === 0 ? "Use New Trade to record your first trade." : "Try adjusting your search or filters."}
              action={trades.length === 0 ? (
                <Button onClick={openNew} disabled={!canAddTrade}>New Trade</Button>
              ) : (
                <Button variant="outline" onClick={() => {
                  setSearch(""); setInstrument("All instruments");
                  setResult("All results"); setStrategy("All strategies");
                }}>
                  Clear filters
                </Button>
              )}
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <SortableTH label="Date" onClick={() => toggleSort("trade_date")} active={sortKey === "trade_date"} dir={sortDir} />
                    <TH>Time</TH>
                    <SortableTH label="Instrument" onClick={() => toggleSort("instrument")} active={sortKey === "instrument"} dir={sortDir} />
                    <TH>Direction</TH>
                    <TH className="text-right">Entry</TH>
                    <TH className="text-right">Exit</TH>
                    <SortableTH label="P/L" onClick={() => toggleSort("profit_loss")} active={sortKey === "profit_loss"} dir={sortDir} className="text-right" />
                    <SortableTH label="Result" onClick={() => toggleSort("result")} active={sortKey === "result"} dir={sortDir} />
                    <TH>Strategy</TH>
                    <TH>TF</TH>
                    <TH>Session</TH>
                    <TH>R:R</TH>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((t) => {
                    const pl = Number(t.profit_loss) || 0;
                    const plClass = pl > 0 ? "text-profit-text" : pl < 0 ? "text-loss-text" : "text-ink-700";
                    const tone = t.result === "Win" ? "profit" : t.result === "Loss" ? "loss" : "neutral";
                    return (
                      <TR key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                        <TD>{t.trade_date}</TD>
                        <TD>{t.trade_time ? t.trade_time.slice(0, 5) : "—"}</TD>
                        <TD className="font-medium text-ink-900">{t.instrument}</TD>
                        <TD>{t.direction}</TD>
                        <TD className="tabular text-right">{fmt(t.entry_price)}</TD>
                        <TD className="tabular text-right">{fmt(t.exit_price)}</TD>
                        <TD className={`tabular text-right font-semibold ${plClass}`}>{formatCurrency(pl, { showSign: true })}</TD>
                        <TD><Badge tone={tone}>{t.result}</Badge></TD>
                        <TD>{t.strategy ?? "—"}</TD>
                        <TD>{t.timeframe ?? "—"}</TD>
                        <TD>{t.session ?? "—"}</TD>
                        <TD>{t.risk_reward ?? "—"}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </>
      )}

      {currentAccount && (
        <>
          <TradeFormModal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSaved={revalidate}
            account={currentAccount}
            weeklyTradeCount={metrics.weeklyTradeCount}
            editing={editing}
          />
          <TradeDetailModal
            trade={detail}
            open={!!detail}
            onClose={() => setDetail(null)}
            onEdit={openEdit}
            onDeleted={revalidate}
          />
        </>
      )}
    </div>
  );
}

function SortableTH({ label, onClick, active, dir, className }: {
  label: string; onClick: () => void; active: boolean; dir: "asc" | "desc"; className?: string;
}) {
  return (
    <TH className={className}>
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 hover:text-ink-700">
        {label}
        {active && <span className="text-3xs text-ink-500">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TH>
  );
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return String(v);
}
