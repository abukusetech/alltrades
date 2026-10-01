"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trash2,
  Pencil,
  Image as ImageIcon,
  AlertTriangle,
  Sunrise,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { deleteTrade } from "@/lib/data/trades";
import { listTradeScreenshots } from "@/lib/data/trade-screenshots";
import { getSignedUrl } from "@/lib/data/screenshots";
import { getDailyAnalysisById } from "@/lib/data/daily-analyses";
import { getSnapshotForTrade } from "@/lib/data/analysis-snapshots";
import { useToast } from "@/components/ui/Toast";
import type { Trade, TradeScreenshot, DailyAnalysis, AnalysisSnapshot } from "@/lib/types";
import { cn, formatCurrency, formatDateLong, parseNumberOrNull } from "@/lib/utils";

export interface TradeDetailModalProps {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onEdit: (t: Trade) => void;
  onDeleted: () => void;
}

interface LoadedShot {
  row: TradeScreenshot;
  url: string | null;
  error: string | null;
}

type TabKey = "overview" | "analysis" | "execution" | "review" | "screenshots";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "analysis", label: "Original Analysis", icon: Sunrise },
  { key: "execution", label: "Execution", icon: BarChart3 },
  { key: "review", label: "Review", icon: MessageSquare },
  { key: "screenshots", label: "Screenshots", icon: ImageIcon },
];

function computeActualRR(trade: Trade): { value: number | null; label: string } {
  const risk = parseNumberOrNull(trade.risk_amount);
  const pl = Number(trade.profit_loss) || 0;
  if (!risk || risk <= 0) return { value: null, label: "—" };
  const r = pl / risk;
  if (!Number.isFinite(r)) return { value: null, label: "—" };
  return { value: r, label: `1:${r.toFixed(2)}` };
}

function computePlannedRR(trade: Trade): { value: number | null; label: string } {
  const raw = trade.risk_reward;
  if (!raw) return { value: null, label: "—" };
  const cleaned = raw.replace(/\s+/g, "");
  const m = cleaned.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return { value: null, label: raw };
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) {
    return { value: null, label: raw };
  }
  return { value: b / a, label: `1:${(b / a).toFixed(2)}` };
}

export function TradeDetailModal({
  trade,
  open,
  onClose,
  onEdit,
  onDeleted,
}: TradeDetailModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [screenshots, setScreenshots] = React.useState<LoadedShot[]>([]);
  const [loadingShots, setLoadingShots] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [analysis, setAnalysis] = React.useState<DailyAnalysis | null>(null);
  const [snapshot, setSnapshot] = React.useState<AnalysisSnapshot | null>(null);

  React.useEffect(() => {
    if (!open || !trade) {
      setScreenshots([]);
      setAnalysis(null);
      setSnapshot(null);
      setTab("overview");
      return;
    }

    let cancelled = false;
    setLoadingShots(true);

    (async () => {
      async function fetchScreenshots(attempt: number): Promise<LoadedShot[]> {
        try {
          const rows = await listTradeScreenshots(supabase, trade!.id);
          const loaded: LoadedShot[] = await Promise.all(
            rows.map(async (r) => {
              try {
                const url = await getSignedUrl(supabase, r.storage_path);
                return {
                  row: r,
                  url,
                  error: url ? null : "Could not generate signed URL",
                };
              } catch (e) {
                return {
                  row: r,
                  url: null,
                  error: e instanceof Error ? e.message : "Signed URL error",
                };
              }
            })
          );
          return loaded;
        } catch (err) {
          if (attempt < 2) {
            console.warn("[ALLTRADES] screenshot fetch retry", { attempt, err });
            await new Promise((r) => setTimeout(r, 400));
            return fetchScreenshots(attempt + 1);
          }
          throw err;
        }
      }

      try {
        const loaded = await fetchScreenshots(0);
        if (!cancelled) setScreenshots(loaded);
      } catch (err) {
        console.error("[ALLTRADES] screenshot load failed after retries", err);
        if (!cancelled) setScreenshots([]);
      } finally {
        if (!cancelled) setLoadingShots(false);
      }

      if (trade.daily_analysis_id) {
        try {
          const a = await getDailyAnalysisById(supabase, trade.daily_analysis_id);
          if (!cancelled) setAnalysis(a);
        } catch {
          if (!cancelled) setAnalysis(null);
        }
      }

      try {
        const s = await getSnapshotForTrade(supabase, trade.id);
        if (!cancelled) setSnapshot(s);
      } catch {
        if (!cancelled) setSnapshot(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, trade, supabase]);

  async function onDelete() {
    if (!trade) return;
    setDeleting(true);
    try {
      await deleteTrade(supabase, trade.id);
      toast.success("Trade deleted");
      setConfirmDelete(false);
      onDeleted();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete trade.";
      toast.error("Could not delete trade", msg);
    } finally {
      setDeleting(false);
    }
  }

  if (!trade) return null;

  const pl = Number(trade.profit_loss) || 0;
  const plClass =
    pl > 0 ? "text-profit-text" : pl < 0 ? "text-loss-text" : "text-ink-700";
  const tone =
    trade.result === "Win"
      ? "profit"
      : trade.result === "Loss"
        ? "loss"
        : "neutral";

  const planned = computePlannedRR(trade);
  const actual = computeActualRR(trade);
  const rrDelta =
    planned.value !== null && actual.value !== null
      ? actual.value - planned.value
      : null;
  const rrDirection =
    rrDelta === null
      ? "unknown"
      : Math.abs(rrDelta) < 0.05
        ? "match"
        : rrDelta > 0
          ? "better"
          : "worse";

  const lightboxImages: LightboxImage[] = screenshots
    .filter((s) => s.url)
    .map((s) => ({
      url: s.url as string,
      alt: s.row.label,
      caption: `${trade.instrument} · ${trade.trade_date} · ${s.row.label}`,
      filename: `alltrades-${trade.instrument}-${trade.trade_date}-${s.row.label
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`,
    }));

  async function downloadFromThumb(url: string, label: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `alltrades-${trade?.instrument}-${trade?.trade_date}-${label
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  const ruleChecks = trade.rule_compliance ?? [];
  const rulePercent =
    ruleChecks.length > 0
      ? Math.round(
          (ruleChecks.filter((r) => r.passed).length / ruleChecks.length) * 100
        )
      : 100;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`${trade.instrument} · ${trade.direction}`}
        description={`${trade.trade_date}${trade.trade_time ? ` · ${trade.trade_time.slice(0, 5)}` : ""}`}
        size="xl"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              className="text-loss-text hover:bg-loss-bg"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => onEdit(trade)}
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
            >
              Edit trade
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        }
      >
        {/* HEADER */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface-soft px-4 py-3">
            <div>
              <Badge tone={tone}>{trade.result}</Badge>
              <div className="mt-1 text-3xs text-ink-500">
                {trade.direction} · {trade.instrument}
                {trade.timeframe ? ` · ${trade.timeframe}` : ""}
              </div>
            </div>
            <div className={`tabular text-lg font-semibold ${plClass}`}>
              {formatCurrency(pl, { showSign: true })}
            </div>
          </div>

          {/* Linked Analysis banner */}
          {analysis && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-brand-200 bg-brand-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sunrise className="h-4 w-4 text-brand-700" />
                <div>
                  <div className="text-2xs font-semibold text-brand-800">
                    Linked Daily Analysis
                  </div>
                  <div className="text-3xs text-brand-700">
                    {formatDateLong(new Date(analysis.analysis_date + "T00:00:00"))}
                  </div>
                </div>
              </div>
              <Link href={`/daily-analysis?date=${analysis.analysis_date}`}>
                <Button variant="outline" size="sm">
                  View Daily Analysis →
                </Button>
              </Link>
            </div>
          )}

          {/* TABS */}
          <div className="border-b border-border">
            <nav className="flex flex-wrap gap-1" role="tablist">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors",
                      active
                        ? "border-brand-600 font-medium text-ink-900"
                        : "border-transparent text-ink-500 hover:text-ink-800"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* TAB CONTENT */}
          {tab === "overview" && (
            <OverviewTab trade={trade} planned={planned} actual={actual} rrDirection={rrDirection} rrDelta={rrDelta} />
          )}

          {tab === "analysis" && (
            <OriginalAnalysisTab snapshot={snapshot} analysis={analysis} />
          )}

          {tab === "execution" && (
            <ExecutionTab trade={trade} />
          )}

          {tab === "review" && (
            <ReviewTab trade={trade} ruleChecks={ruleChecks} rulePercent={rulePercent} />
          )}

          {tab === "screenshots" && (
            <ScreenshotsTab
              screenshots={screenshots}
              loadingShots={loadingShots}
              onOpen={(i) => setLightboxIndex(i)}
              onDownload={downloadFromThumb}
            />
          )}
        </div>
      </Modal>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        title="Delete this trade?"
        description="This will permanently remove the trade and its screenshots."
        confirmLabel="Delete trade"
        destructive
        loading={deleting}
      />
    </>
  );
}

// ---------- Tabs ----------

function OverviewTab({
  trade,
  planned,
  actual,
  rrDirection,
  rrDelta,
}: {
  trade: Trade;
  planned: { value: number | null; label: string };
  actual: { value: number | null; label: string };
  rrDirection: string;
  rrDelta: number | null;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Detail label="Lot size" value={fmt(trade.lot_size)} />
        <Detail label="Entry" value={fmt(trade.entry_price)} />
        <Detail label="Exit" value={fmt(trade.exit_price)} />
        <Detail label="Stop loss" value={fmt(trade.stop_loss)} />
        <Detail label="Take profit" value={fmt(trade.take_profit)} />
        <Detail label="Risk amount" value={money(trade.risk_amount)} />
        <Detail label="Pips" value={fmt(trade.pips)} />
        <Detail label="Holding time" value={trade.holding_time ?? "—"} />
        <Detail label="Strategy" value={trade.strategy ?? "—"} />
        <Detail label="Setup type" value={trade.setup_type ?? "—"} />
        <Detail label="Session" value={trade.session ?? "—"} />
        <Detail label="Market bias" value={trade.market_bias ?? "—"} />
      </div>

      <div className="rounded-lg border border-border bg-surface-soft p-4">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
          Risk : Reward
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RRStat label="Planned" value={planned.label} tone="neutral" />
          <RRStat
            label="Actual"
            value={actual.label}
            tone={
              rrDirection === "better"
                ? "profit"
                : rrDirection === "worse"
                  ? "loss"
                  : "neutral"
            }
          />
          <div>
            <div className="text-3xs uppercase tracking-wide text-ink-500">
              Outcome
            </div>
            <div className="mt-0.5 text-xs font-medium text-ink-700">
              {rrDirection === "better" && `Better than planned (+${rrDelta?.toFixed(2)}R)`}
              {rrDirection === "worse" && `Worse than planned (${rrDelta?.toFixed(2)}R)`}
              {rrDirection === "match" && "Matched planned RR"}
              {rrDirection === "unknown" && "—"}
            </div>
          </div>
        </div>
      </div>

      <LongForm title="Notes" value={trade.notes} />
    </div>
  );
}

function OriginalAnalysisTab({
  snapshot,
  analysis,
}: {
  snapshot: AnalysisSnapshot | null;
  analysis: DailyAnalysis | null;
}) {
  if (!snapshot && !analysis) {
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-border-strong bg-surface-soft px-4 py-6 text-2xs text-ink-500">
        <Sunrise className="h-4 w-4" />
        No original analysis linked to this trade.
      </div>
    );
  }

  // Prefer the frozen snapshot, fall back to the live analysis
  const snap = snapshot?.snapshot as
    | {
        analysis?: Record<string, unknown>;
        plan?: Record<string, unknown> | null;
        frozen_at?: string;
      }
    | undefined;

  if (snap?.analysis) {
    const a = snap.analysis as {
      date?: string;
      instrument?: string;
      higher_timeframe_bias?: string | null;
      market_structure?: string | null;
      expected_move?: string | null;
      invalidation?: string | null;
      tags?: {
        bias?: string[];
        structure?: string[];
        liquidity?: string[];
        setup?: string[];
        session?: string[];
        news?: string[];
      };
    };
    const p = snap.plan as
      | {
          code?: string;
          direction?: string;
          entry_price?: number | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          sl_pips?: number | null;
          risk_percent?: number | null;
          rr?: number | null;
          expected_profit?: number | null;
        }
      | null;

    return (
      <div className="space-y-5">
        <div className="rounded border border-brand-200 bg-brand-50 px-3 py-2 text-3xs text-brand-700">
          Frozen pre-trade snapshot captured at{" "}
          {snap.frozen_at
            ? new Date(snap.frozen_at).toLocaleString("en-GB")
            : "trade creation"}
          . This will never change if you later edit the Daily Analysis.
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail label="Analysis date" value={a.date ?? "—"} />
          <Detail label="Instrument" value={a.instrument ?? "—"} />
          <Detail label="HTF bias" value={a.higher_timeframe_bias ?? "—"} />
          <Detail label="Market structure" value={a.market_structure ?? "—"} />
          <Detail
            label="Planned direction"
            value={p?.direction ?? "—"}
          />
          <Detail label="Plan code" value={p?.code ?? "—"} />
          <Detail
            label="Planned entry"
            value={p?.entry_price !== null && p?.entry_price !== undefined ? String(p.entry_price) : "—"}
          />
          <Detail
            label="Planned SL"
            value={p?.stop_loss !== null && p?.stop_loss !== undefined ? String(p.stop_loss) : "—"}
          />
          <Detail
            label="Planned TP"
            value={p?.take_profit !== null && p?.take_profit !== undefined ? String(p.take_profit) : "—"}
          />
          <Detail
            label="Planned SL pips"
            value={p?.sl_pips !== null && p?.sl_pips !== undefined ? `${p.sl_pips} pips` : "—"}
          />
          <Detail
            label="Planned risk %"
            value={p?.risk_percent !== null && p?.risk_percent !== undefined ? `${p.risk_percent}%` : "—"}
          />
          <Detail
            label="Planned RR"
            value={p?.rr !== null && p?.rr !== undefined ? `1:${p.rr.toFixed(2)}` : "—"}
          />
        </div>

        {a.expected_move && (
          <LongForm title="Expected move" value={a.expected_move} />
        )}
        {a.invalidation && (
          <LongForm title="Invalidation" value={a.invalidation} />
        )}

        {a.tags && (
          <div className="space-y-2">
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
              Tags
            </h3>
            {Object.entries(a.tags).map(([group, tags]) =>
              tags && tags.length > 0 ? (
                <div key={group} className="text-2xs">
                  <span className="text-ink-500 capitalize">{group}: </span>
                  <span className="inline-flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-border bg-surface-soft px-1.5 py-0.5 text-3xs text-ink-700"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback: show live analysis fields
  return (
    <div className="space-y-5">
      <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-3xs text-warn-text">
        No snapshot found — showing current live analysis. Live data may have
        changed since the trade was taken.
      </div>
      {analysis && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail label="Analysis date" value={analysis.analysis_date} />
          <Detail label="Instrument" value={analysis.instrument} />
          <Detail label="HTF bias" value={analysis.higher_timeframe_bias ?? "—"} />
          <Detail label="Market structure" value={analysis.market_structure ?? "—"} />
          <Detail label="Planned direction" value={analysis.planned_direction ?? "—"} />
          <Detail label="Planned entry" value={fmt(analysis.planned_entry)} />
          <Detail label="Planned SL" value={fmt(analysis.planned_stop_loss)} />
          <Detail label="Planned TP" value={fmt(analysis.planned_take_profit)} />
        </div>
      )}
      {analysis?.expected_move && (
        <LongForm title="Expected move" value={analysis.expected_move} />
      )}
      {analysis?.invalidation && (
        <LongForm title="Invalidation" value={analysis.invalidation} />
      )}
    </div>
  );
}

function ExecutionTab({ trade }: { trade: Trade }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Detail label="Entry" value={fmt(trade.entry_price)} />
        <Detail label="Exit" value={fmt(trade.exit_price)} />
        <Detail label="Stop loss" value={fmt(trade.stop_loss)} />
        <Detail label="Take profit" value={fmt(trade.take_profit)} />
        <Detail label="Lot size" value={fmt(trade.lot_size)} />
        <Detail label="Pips" value={fmt(trade.pips)} />
        <Detail label="Commission" value={money(trade.commission)} />
        <Detail label="Swap" value={money(trade.swap)} />
        <Detail label="Spread" value={fmt(trade.spread)} />
        <Detail label="Holding time" value={trade.holding_time ?? "—"} />
        <Detail label="Result" value={trade.result} />
        <Detail label="P/L" value={money(trade.profit_loss)} />
      </div>
      <LongForm title="Exit reason" value={trade.exit_reason} />
      <LongForm title="Management" value={trade.management} />
    </div>
  );
}

function ReviewTab({
  trade,
  ruleChecks,
  rulePercent,
}: {
  trade: Trade;
  ruleChecks: import("@/lib/types").RuleCheck[];
  rulePercent: number;
}) {
  return (
    <div className="space-y-5">
      {/* Rule compliance */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
            Rule Compliance
          </h3>
          <Badge tone={rulePercent === 100 ? "profit" : rulePercent >= 70 ? "warn" : "loss"}>
            {rulePercent}%
          </Badge>
        </div>
        {ruleChecks.length === 0 ? (
          <p className="mt-2 text-2xs text-ink-500">
            No rule compliance recorded for this trade.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {ruleChecks.map((r) => (
              <li
                key={r.key}
                className={cn(
                  "flex items-center gap-2 rounded border px-3 py-2 text-2xs",
                  r.passed
                    ? "border-profit-border bg-profit-bg text-profit-text"
                    : "border-loss-border bg-loss-bg text-loss-text"
                )}
              >
                {r.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span className="flex-1">{r.label}</span>
                {r.detail && (
                  <span className="text-3xs opacity-80">{r.detail}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {trade.entry_tags && trade.entry_tags.length > 0 && (
        <TagRow label="Entry tags" tags={trade.entry_tags} />
      )}
      {trade.exit_tags && trade.exit_tags.length > 0 && (
        <TagRow label="Exit tags" tags={trade.exit_tags} />
      )}
      {trade.management_tags && trade.management_tags.length > 0 && (
        <TagRow label="Management tags" tags={trade.management_tags} />
      )}
      {trade.well_tags && trade.well_tags.length > 0 && (
        <TagRow label="What I did well" tags={trade.well_tags} />
      )}
      {trade.mistake_tags && trade.mistake_tags.length > 0 && (
        <TagRow label="Mistake tags" tags={trade.mistake_tags} tone="warn" />
      )}
      {trade.emotion_before_tags && trade.emotion_before_tags.length > 0 && (
        <TagRow label="Emotions before" tags={trade.emotion_before_tags} />
      )}
      {trade.emotion_after_tags && trade.emotion_after_tags.length > 0 && (
        <TagRow label="Emotions after" tags={trade.emotion_after_tags} />
      )}
      {trade.market_tags && trade.market_tags.length > 0 && (
        <TagRow label="Market observation" tags={trade.market_tags} />
      )}
      {trade.lesson_tags && trade.lesson_tags.length > 0 && (
        <TagRow label="Lesson tags" tags={trade.lesson_tags} />
      )}

      <LongForm title="What I did well" value={trade.what_went_well} />
      <LongForm title="Mistakes" value={trade.mistakes} />
      <LongForm title="Emotions" value={trade.emotions} />
      <LongForm title="Market observation" value={trade.market_observation} />
      <LongForm title="Lesson" value={trade.lesson} />
    </div>
  );
}

function ScreenshotsTab({
  screenshots,
  loadingShots,
  onOpen,
  onDownload,
}: {
  screenshots: LoadedShot[];
  loadingShots: boolean;
  onOpen: (i: number) => void;
  onDownload: (url: string, label: string, e: React.MouseEvent) => void;
}) {
  if (loadingShots) {
    return (
      <div className="rounded border border-border bg-surface-soft px-4 py-6 text-center text-2xs text-ink-500">
        Loading screenshots…
      </div>
    );
  }
  if (screenshots.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-border-strong bg-surface-soft px-4 py-6 text-2xs text-ink-500">
        <ImageIcon className="h-4 w-4" />
        No screenshots attached to this trade.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {screenshots.map((s, i) => {
        if (!s.url) {
          return (
            <div
              key={s.row.id}
              className="flex items-start gap-2 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <div className="font-medium">
                  {s.row.label} could not be displayed
                </div>
                <div className="text-3xs opacity-80">
                  {s.error ?? "Unknown error"}
                </div>
              </div>
            </div>
          );
        }
        return (
          <div
            key={s.row.id}
            className="overflow-hidden rounded-lg border border-border bg-surface-soft"
          >
            <div className="flex items-center justify-between border-b border-border bg-white px-3 py-2">
              <span className="text-2xs font-medium text-ink-700">
                {s.row.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpen(i)}
                  className="rounded px-2 py-1 text-3xs text-ink-600 hover:bg-ink-100"
                >
                  View full size
                </button>
                <button
                  type="button"
                  onClick={(e) => onDownload(s.url!, s.row.label, e)}
                  className="rounded px-2 py-1 text-3xs text-ink-600 hover:bg-ink-100"
                >
                  Download
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen(i)}
              className="block w-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={s.row.label}
                className="max-h-[420px] w-full bg-ink-950/5 object-contain"
                referrerPolicy="no-referrer"
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Helpers ----------

function TagRow({
  label,
  tags,
  tone,
}: {
  label: string;
  tags: string[];
  tone?: "warn";
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className={cn(
              "rounded border px-2 py-0.5 text-3xs",
              tone === "warn"
                ? "border-warn-border bg-warn-bg text-warn-text"
                : "border-border bg-surface-soft text-ink-700"
            )}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return String(v);
}

function money(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return formatCurrency(v);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-xs font-medium text-ink-900">{value}</div>
    </div>
  );
}

function RRStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "profit" | "loss" | "neutral";
}) {
  const cls =
    tone === "profit"
      ? "text-profit-text"
      : tone === "loss"
        ? "text-loss-text"
        : "text-ink-900";
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`tabular mt-0.5 text-sm font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function LongForm({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </h3>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink-700">
        {value}
      </p>
    </div>
  );
}

