"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

export function AnalysisDetailModal({
  analysis,
  open,
  onClose,
  onEdit,
  onDeleted,
}: AnalysisDetailModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [screenshots, setScreenshots] = React.useState<
    { row: AnalysisScreenshot; url: string | null }[]
  >([]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open || !analysis) {
      setScreenshots([]);
      return;
    }
    (async () => {
      try {
        const rows = await listAnalysisScreenshots(supabase, analysis.id);
        const withUrls = await Promise.all(
          rows.map(async (r) => ({
            row: r,
            url: await getSignedUrl(supabase, r.storage_path),
          }))
        );
        setScreenshots(withUrls);
      } catch {
        setScreenshots([]);
      }
    })();
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

          {screenshots.length > 0 && (
            <div>
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Charts
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {screenshots.map(({ row, url }) =>
                  url ? (
                    <a
                      key={row.id}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Analysis screenshot"
                        className="h-32 w-full object-cover transition-transform hover:scale-[1.02]"
                      />
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

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
