"use client";

import * as React from "react";
import { Trash2, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

export function TradeDetailModal({
  trade,
  open,
  onClose,
  onEdit,
  onDeleted,
}: TradeDetailModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [screenshots, setScreenshots] = React.useState<
    { row: TradeScreenshot; url: string | null }[]
  >([]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open || !trade) {
      setScreenshots([]);
      return;
    }
    (async () => {
      try {
        const rows = await listTradeScreenshots(supabase, trade.id);
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
          {/* Headline */}
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

          {/* Grid of details */}
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

          {/* Long-form */}
          <LongForm title="Entry reason" value={trade.entry_reason} />
          <LongForm title="Exit reason" value={trade.exit_reason} />
          <LongForm title="Management" value={trade.management} />
          <LongForm title="Mistakes" value={trade.mistakes} />
          <LongForm title="Emotions" value={trade.emotions} />
          <LongForm title="Notes" value={trade.notes} />

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div>
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">
                Screenshots
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
                        alt={row.label}
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
