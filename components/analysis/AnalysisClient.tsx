"use client";

import * as React from "react";
import { Plus, ScanSearch } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { useTrades, useWithdrawals, useAnalyses, useRevalidateAccount } from "@/lib/data/hooks";
import { computeAnalysisStats, computeAccountMetrics } from "@/lib/calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table, TableWrap, TBody, TD, TH, THead, TR,
} from "@/components/ui/Table";
import { AnalysisFormModal } from "./AnalysisFormModal";
import { AnalysisDetailModal } from "./AnalysisDetailModal";
import { AnalysisStatsCards } from "./AnalysisStatsCards";
import { INSTRUMENTS, TIMEFRAMES, ANALYSIS_OUTCOMES } from "@/lib/constants";
import type { Analysis } from "@/lib/types";

export function AnalysisClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const { data: analyses = [], isLoading } = useAnalyses(currentAccountId);
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const revalidate = useRevalidateAccount(currentAccountId);

  const [instrument, setInstrument] = React.useState("All instruments");
  const [timeframe, setTimeframe] = React.useState("All timeframes");
  const [outcome, setOutcome] = React.useState("All outcomes");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Analysis | null>(null);
  const [detail, setDetail] = React.useState<Analysis | null>(null);

  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  const filtered = React.useMemo(() => {
    let rows = analyses;
    if (instrument !== "All instruments") rows = rows.filter((a) => a.instrument === instrument);
    if (timeframe !== "All timeframes") rows = rows.filter((a) => a.timeframe === timeframe);
    if (outcome !== "All outcomes") rows = rows.filter((a) => a.outcome === outcome);
    return rows;
  }, [analyses, instrument, timeframe, outcome]);

  const stats = React.useMemo(() => computeAnalysisStats(analyses), [analyses]);

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(a: Analysis) { setDetail(null); setEditing(a); setFormOpen(true); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analysis Journal"
        subtitle="Build your market read before execution, then review whether your prediction was correct."
        actions={currentAccount ? <Button onClick={openNew} leftIcon={<Plus className="h-3.5 w-3.5" />}>New Analysis</Button> : undefined}
      />

      {!currentAccount ? (
        <EmptyState title="No account selected" description="Create an account in Settings before recording analyses." />
      ) : (
        <>
          <AccountHeader account={currentAccount} currentCapital={metrics.currentCapital} />
          <AnalysisStatsCards stats={stats} />

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <Select value={instrument} onChange={(e) => setInstrument(e.target.value)} options={["All instruments", ...INSTRUMENTS] as unknown as string[]} />
              <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} options={["All timeframes", ...TIMEFRAMES] as unknown as string[]} />
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} options={["All outcomes", ...ANALYSIS_OUTCOMES] as unknown as string[]} />
            </div>
          </div>

          {isLoading && analyses.length === 0 ? (
            <BlockLoader label="Loading analyses" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ScanSearch className="h-4 w-4" />}
              title={analyses.length === 0 ? "No market analyses yet" : "No analyses match your filters"}
              description={analyses.length === 0 ? "Start with your higher-timeframe bias, liquidity and setup before taking a trade." : "Try adjusting the filters above."}
              action={analyses.length === 0 ? (
                <Button onClick={openNew}>Create First Analysis</Button>
              ) : (
                <Button variant="outline" onClick={() => { setInstrument("All instruments"); setTimeframe("All timeframes"); setOutcome("All outcomes"); }}>
                  Clear filters
                </Button>
              )}
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Date</TH><TH>Time</TH><TH>Instrument</TH><TH>TF</TH>
                    <TH>Session</TH><TH>Bias</TH><TH>Setup</TH><TH>Outcome</TH><TH>Confidence</TH>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((a) => (
                    <TR key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                      <TD>{a.analysis_date}</TD>
                      <TD>{a.analysis_time ? a.analysis_time.slice(0, 5) : "—"}</TD>
                      <TD className="font-medium text-ink-900">{a.instrument}</TD>
                      <TD>{a.timeframe ?? "—"}</TD>
                      <TD>{a.session ?? "—"}</TD>
                      <TD>{a.market_bias ?? "—"}</TD>
                      <TD>{a.setup ?? "—"}</TD>
                      <TD>
                        <Badge tone={a.outcome === "Correct" ? "profit" : a.outcome === "Partially Correct" ? "warn" : a.outcome === "Incorrect" ? "loss" : "neutral"}>
                          {a.outcome}
                        </Badge>
                      </TD>
                      <TD>{a.confidence ?? "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </>
      )}

      {currentAccount && (
        <>
          <AnalysisFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={revalidate} account={currentAccount} editing={editing} />
          <AnalysisDetailModal analysis={detail} open={!!detail} onClose={() => setDetail(null)} onEdit={openEdit} onDeleted={revalidate} />
        </>
      )}
    </div>
  );
}
