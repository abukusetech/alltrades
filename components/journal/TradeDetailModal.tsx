"use client";

import * as React from "react";
import { Trash2, Pencil, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { deleteTrade } from "@/lib/data/trades";
import { listTradeScreenshots } from "@/lib/data/trade-screenshots";
import { getSignedUrl } from "@/lib/data/screenshots";
import { useToast } from "@/components/ui/Toast";
import type { Trade, TradeScreenshot } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

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

  React.useEffect(() => {
    if (!open || !trade) {
      setScreenshots([]);
      return;
    }

    let cancelled = false;
    setLoadingShots(true);

    (async () => {
      try {
        const rows = await listTradeScreenshots(supabase, trade.id);
        // eslint-disable-next-line no-console
        console.log("[ALLTRADES] trade detail screenshot rows", rows);

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

        // eslint-disable-next-line no-console
        console.log("[ALLTRADES] trade detail loaded", loaded);

        if (!cancelled) setScreenshots(loaded);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[ALLTRADES] trade detail load failed", e);
        if (!cancelled) setScreenshots([]);
      } finally {
        if (!cancelled) setLoadingShots(false);
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Lot size" value={fmt(trade.lot_size)} />
            <Detail label="Entry" value={fmt(trade.entry_price)} />
            <Detail label="Exit" value={fmt(trade.exit_price)} />
            <Detail label="Stop loss" value={fmt(trade.stop_loss)} />
            <Detail label="Take profit" value={fmt(trade.take_profit)} />
            <Detail label="Risk amount" value={money(trade.risk_amount)} />
            <Detail label="R:R" value={trade.risk_reward ?? "—"} />
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

          <LongForm title="Entry reason" value={trade.entry_reason} />
          <LongForm title="Exit reason" value={trade.exit_reason} />
          <LongForm title="Management" value={trade.management} />
          <LongForm title="Mistakes" value={trade.mistakes} />
          <LongForm title="Emotions" value={trade.emotions} />
          <LongForm title="Notes" value={trade.notes} />

          {/* SCREENSHOTS */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Screenshots{" "}
                {screenshots.length > 0 ? `(${screenshots.length})` : ""}
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
                            {s.error ?? "Unknown error"}. File exists at{" "}
                            <code>{s.row.storage_path}</code>.
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
                            title="Open full size"
                          >
                            View full size
                          </button>
                          <button
                            type="button"
                            onClick={(e) =>
                              downloadFromThumb(s.url!, s.row.label, e)
                            }
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
                        aria-label="Open image in full size"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.url}
                          alt={s.row.label}
                          className="max-h-[420px] w-full bg-ink-950/5 object-contain"
                          loading="lazy"
                          onError={() => {
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
      <div className="text-3xs uppercase tracking-wide text-ink-500">
        {label}
      </div>
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
