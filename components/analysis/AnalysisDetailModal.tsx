"use client";

import * as React from "react";
import { Pencil, Trash2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { deleteAnalysis } from "@/lib/data/analyses";
import { listAnalysisScreenshots } from "@/lib/data/analysis-screenshots";
import { getSignedUrl } from "@/lib/data/screenshots";
import { useToast } from "@/components/ui/Toast";
import type { Analysis, AnalysisScreenshot } from "@/lib/types";

export interface AnalysisDetailModalProps {
  analysis: Analysis | null;
  open: boolean;
  onClose: () => void;
  onEdit: (a: Analysis) => void;
  onDeleted: () => void;
}

function outcomeTone(o: Analysis["outcome"]) {
  if (o === "Correct") return "profit" as const;
  if (o === "Partially Correct") return "warn" as const;
  if (o === "Incorrect") return "loss" as const;
  return "neutral" as const;
}

interface LoadedScreenshot {
  row: AnalysisScreenshot;
  url: string | null;
  error: string | null;
}

export function AnalysisDetailModal({
  analysis,
  open,
  onClose,
  onEdit,
  onDeleted,
}: AnalysisDetailModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [screenshots, setScreenshots] = React.useState<LoadedScreenshot[]>([]);
  const [loadingShots, setLoadingShots] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open || !analysis) {
      setScreenshots([]);
      return;
    }

    let cancelled = false;
    setLoadingShots(true);

    (async () => {
      try {
        const rows = await listAnalysisScreenshots(supabase, analysis.id);
        // eslint-disable-next-line no-console
        console.log("[ALLTRADES] detail modal screenshot rows", rows);

        const loaded: LoadedScreenshot[] = await Promise.all(
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

        // eslint-disable-next-line no-console
        console.log("[ALLTRADES] detail modal loaded", loaded);

        if (!cancelled) setScreenshots(loaded);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ALLTRADES] detail modal load failed", e);
        if (!cancelled) setScreenshots([]);
      } finally {
        if (!cancelled) setLoadingShots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, analysis, supabase]);

  async function onDelete() {
    if (!analysis) return;
    setDeleting(true);
    try {
      await deleteAnalysis(supabase, analysis.id);
      toast.success("Analysis deleted");
      setConfirmDelete(false);
      onDeleted();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete.";
      toast.error("Could not delete analysis", msg);
    } finally {
      setDeleting(false);
    }
  }

  if (!analysis) return null;

  const lightboxImages: LightboxImage[] = screenshots
    .filter((s) => s.url)
    .map((s, i) => ({
      url: s.url as string,
      alt: `Analysis chart ${i + 1}`,
      caption: `${analysis.instrument} · ${analysis.analysis_date} · Chart ${i + 1}`,
      filename: `alltrades-analysis-${analysis.instrument}-${analysis.analysis_date}-${i + 1}.png`,
    }));

  async function downloadFromThumb(url: string, i: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `alltrades-analysis-${analysis?.instrument}-${analysis?.analysis_date}-${i + 1}.png`;
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
        title={`${analysis.instrument} · ${analysis.timeframe ?? "—"}`}
        description={`${analysis.analysis_date}${analysis.analysis_time ? ` · ${analysis.analysis_time.slice(0, 5)}` : ""}`}
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
              onClick={() => onEdit(analysis)}
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface-soft px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={outcomeTone(analysis.outcome)}>
                {analysis.outcome}
              </Badge>
              {analysis.session && <Badge tone="neutral">{analysis.session}</Badge>}
              {analysis.market_bias && (
                <Badge tone="neutral">{analysis.market_bias}</Badge>
              )}
            </div>
            {analysis.confidence && (
              <span className="text-3xs uppercase tracking-wide text-ink-500">
                Confidence: {analysis.confidence}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Market structure" value={analysis.market_structure ?? "—"} />
            <Detail label="Liquidity focus" value={analysis.liquidity_focus ?? "—"} />
            <Detail label="Fair value gap" value={analysis.fair_value_gap ?? "—"} />
            <Detail label="Order blocks" value={analysis.order_blocks ?? "—"} />
            <Detail label="BOS / CHOCH" value={analysis.bos_choch ?? "—"} />
            <Detail label="Setup" value={analysis.setup ?? "—"} />
            <Detail label="Prev week high" value={fmt(analysis.prev_week_high)} />
            <Detail label="Prev week low" value={fmt(analysis.prev_week_low)} />
            <Detail label="Prev day high" value={fmt(analysis.prev_day_high)} />
            <Detail label="Prev day low" value={fmt(analysis.prev_day_low)} />
            <Detail label="Entry zone" value={analysis.entry_zone ?? "—"} />
            <Detail label="Invalidation" value={analysis.invalidation ?? "—"} />
            <Detail label="Stop loss" value={fmt(analysis.stop_loss)} />
            <Detail label="Take profit" value={fmt(analysis.take_profit)} />
            <Detail label="Expected R:R" value={analysis.expected_rr ?? "—"} />
          </div>

          <LongForm title="Prediction" value={analysis.prediction} />
          {analysis.support_resistance && (
            <LongForm title="Support & Resistance" value={analysis.support_resistance} />
          )}
          <LongForm title="Actual move" value={analysis.actual_move} />
          <LongForm title="Lessons" value={analysis.lessons} />
          <LongForm title="Notes" value={analysis.notes} />

          {/* CHARTS */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Charts {screenshots.length > 0 ? `(${screenshots.length})` : ""}
              </h3>
              {lightboxImages.length > 0 && (
                <span className="text-3xs text-ink-500">
                  Click any chart to enlarge
                </span>
              )}
            </div>

            {loadingShots ? (
              <div className="rounded border border-border bg-surface-soft px-4 py-6 text-center text-2xs text-ink-500">
                Loading charts…
              </div>
            ) : screenshots.length === 0 ? (
              <div className="flex items-center gap-2 rounded border border-dashed border-border-strong bg-surface-soft px-4 py-6 text-2xs text-ink-500">
                <ImageIcon className="h-4 w-4" />
                No charts attached to this analysis.
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
                            Chart {i + 1} could not be displayed
                          </div>
                          <div className="text-3xs opacity-80">
                            {s.error ?? "Unknown error"}. The file exists in
                            storage at <code>{s.row.storage_path}</code>.
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
                          Chart {i + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setLightboxIndex(i)}
                            className="rounded px-2 py-1 text-3xs text-ink-600 hover:bg-ink-100"
                            title="Open full size"
                          >
                            View full size
                          </button>
                          <button
                            type="button"
                            onClick={(e) => downloadFromThumb(s.url!, i, e)}
                            className="rounded px-2 py-1 text-3xs text-ink-600 hover:bg-ink-100"
                            title="Download"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        className="block w-full cursor-zoom-in"
                        aria-label="Open chart in full size"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.url}
                          alt={`Chart ${i + 1}`}
                          className="max-h-[420px] w-full bg-ink-950/5 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            // eslint-disable-next-line no-console
                            console.error("[ALLTRADES] <img> failed to load", {
                              src: s.url,
                              storagePath: s.row.storage_path,
                            });
                          }}
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
        title="Delete this analysis?"
        description="This will permanently remove the analysis and its charts."
        confirmLabel="Delete analysis"
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-xs font-medium text-ink-900">{value}</div>
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
