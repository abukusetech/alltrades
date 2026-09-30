"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trash2,
  Pencil,
  Image as ImageIcon,
  AlertTriangle,
  Sunrise,
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
import { useToast } from "@/components/ui/Toast";
import type { Trade, TradeScreenshot, DailyAnalysis } from "@/lib/types";
import { formatCurrency, formatDateLong, parseNumberOrNull } from "@/lib/utils";

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
  const [screenshots, setScreenshots] = React.useState<LoadedShot[]>([]);
  const [loadingShots, setLoadingShots] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [analysis, setAnalysis] = React.useState<DailyAnalysis | null>(null);

  React.useEffect(() => {
    if (!open || !trade) {
      setScreenshots([]);
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    setLoadingShots(true);

    (async () => {
      try {
        const rows = await listTradeScreenshots(supabase, trade.id);
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
        if (!cancelled) setScreenshots(loaded);
      } catch {
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
  const rrDeltaClass =
    rrDirection === "better"
      ? "text-profit-text"
      : rrDirection === "worse"
        ? "text-loss-text"
        : "text-ink-500";

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

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`${trade.instrument} · ${trade.direction}`}
        description={`${trade.trade_date}${trade.trade_time ? ` · ${trade.trade_time.slice(0, 5)}` : ""}`}
        size="lg"
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
        <div className="space-y-5">
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

          {/* Daily Analysis link */}
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
                  Open analysis →
                </Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Lot size" value={fmt(trade.lot_size)} />
            <Detail label="Entry" value={fmt(trade.entry_price)} />
            <Detail label="Exit" value={fmt(trade.exit_price)} />
            <Detail label="Stop loss" value={fmt(trade.stop_loss)} />
            <Detail label="Take profit" value={fmt(trade.take_profit)} />
            <Detail label="Risk amount" value={money(trade.risk_amount)} />
            <Detail label="Pips" value={fmt(trade.pips)} />
            <Detail label="Commission" value={money(trade.commission)} />
            <Detail label="Swap" value={money(trade.swap)} />
            <Detail label="Spread" value={fmt(trade.spread)} />
            <Detail label="Holding time" value={trade.holding_time ?? "—"} />
            <Detail label="Strategy" value={trade.strategy ?? "—"} />
            <Detail label="Setup type" value={trade.setup_type ?? "—"} />
            <Detail label="Session" value={trade.session ?? "—"} />
            <Detail label="Market bias" value={trade.market_bias ?? "—"} />
            <Detail label="Entry model" value={trade.entry_model ?? "—"} />
            <Detail label="Liquidity taken" value={trade.liquidity_taken ?? "—"} />
            <Detail label="News / event" value={trade.news_event ?? "—"} />
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
                <div className={`mt-0.5 text-xs font-medium ${rrDeltaClass}`}>
                  {rrDirection === "better" &&
                    `Closed better than planned (+${rrDelta?.toFixed(2)}R)`}
                  {rrDirection === "worse" &&
                    `Closed worse than planned (${rrDelta?.toFixed(2)}R)`}
                  {rrDirection === "match" && "Matched planned RR"}
                  {rrDirection === "unknown" && "—"}
                </div>
              </div>
            </div>
          </div>

          <LongForm title="Entry reason" value={trade.entry_reason} />
          <LongForm title="Exit reason" value={trade.exit_reason} />
          <LongForm title="Management" value={trade.management} />
          <LongForm title="What I did well" value={trade.what_went_well} />
          <LongForm title="Mistakes" value={trade.mistakes} />
          <LongForm title="Emotions" value={trade.emotions} />
          <LongForm title="Market observation" value={trade.market_observation} />
          <LongForm title="Lesson" value={trade.lesson} />
          <LongForm title="Notes" value={trade.notes} />

          {trade.mistake_tags && trade.mistake_tags.length > 0 && (
            <div>
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Mistake tags
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {trade.mistake_tags.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-warn-border bg-warn-bg px-2 py-0.5 text-3xs text-warn-text"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Screenshots {screenshots.length > 0 ? `(${screenshots.length})` : ""}
              </h3>
              {lightboxImages.length > 0 && (
                <span className="text-3xs text-ink-500">
                  Click any image to enlarge
                </span>
              )}
            </div>

            {loadingShots ? (
              <div className="rounded border border-border bg-surface-soft px-4 py-6 text-center text-2xs text-ink-500">
                Loading screenshots…
              </div>
            ) : screenshots.length === 0 ? (
              <div className="flex items-center gap-2 rounded border border-dashed border-border-strong bg-surface-soft px-4 py-6 text-2xs text-ink-500">
                <ImageIcon className="h-4 w-4" />
                No screenshots attached to this trade.
              </div>
            ) : (
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
                            onClick={() => setLightboxIndex(i)}
                            className="rounded px-2 py-1 text-3xs text-ink-600 hover:bg-ink-100"
                          >
                            View full size
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              downloadFromThumb(s.url!, s.row.label, e)
                            }
                            className="rounded px-2 py-1 text-3xs text-ink-600 hover:bg-ink-100"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(i)}
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
            )}
          </div>
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
