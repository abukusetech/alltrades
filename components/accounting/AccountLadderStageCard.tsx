"use client";

import * as React from "react";
import { CheckCircle2, Circle, Package, Lock, Archive, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AccountingPurchase } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export type PurchaseStatus = AccountingPurchase["status"];

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  planned: "Planned",
  purchased: "Purchased",
  active: "Active",
  payout_eligible: "Payout Eligible",
  completed: "Completed",
  lost: "Lost",
  archived: "Archived",
};

const STATUS_TONE: Record<PurchaseStatus, "neutral" | "brand" | "profit" | "loss" | "warn"> = {
  planned: "neutral",
  purchased: "brand",
  active: "profit",
  payout_eligible: "warn",
  completed: "profit",
  lost: "loss",
  archived: "neutral",
};

const STATUS_ICON: Record<PurchaseStatus, React.ComponentType<{ className?: string }>> = {
  planned: Circle,
  purchased: Package,
  active: CheckCircle2,
  payout_eligible: AlertTriangle,
  completed: CheckCircle2,
  lost: AlertTriangle,
  archived: Archive,
};

export function AccountLadderStageCard({
  purchase,
  isNext,
  fundedPercent,
  onEdit,
  onAdvance,
  onBuy,
  liveBalance,
}: {
  purchase: AccountingPurchase;
  isNext: boolean;
  fundedPercent: number;
  onEdit: () => void;
  onAdvance: (next: PurchaseStatus) => void;
  onBuy?: () => void;
  liveBalance?: number | null;
}) {
  const Icon = STATUS_ICON[purchase.status];
  const tone = STATUS_TONE[purchase.status];

  const isPurchased = purchase.status !== "planned" && purchase.status !== "archived";

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4 shadow-card transition-colors",
        isNext && !isPurchased ? "border-brand-500 ring-1 ring-brand-200" : "border-border",
        isPurchased && purchase.status !== "lost" && "bg-profit-bg/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4",
              purchase.status === "lost"
                ? "text-loss-text"
                : isPurchased
                  ? "text-profit-text"
                  : isNext
                    ? "text-brand-600"
                    : "text-ink-400"
            )}
          />
          <div>
            <div className="text-sm font-semibold text-ink-900">
              ${purchase.size.toLocaleString()}
            </div>
            <div className="mt-0.5 text-3xs text-ink-500">
              ${Number(purchase.price).toFixed(2)} to purchase
            </div>
          </div>
        </div>
        <Badge tone={tone}>{STATUS_LABEL[purchase.status]}</Badge>
      </div>

      {isPurchased && purchase.purchased_on && (
        <div className="mt-3 flex flex-col gap-1">
          <div className="text-3xs text-ink-500">
            Purchased {purchase.purchased_on}
          </div>
          {liveBalance !== null && liveBalance !== undefined && (
            <div className="rounded bg-brand-50 px-2 py-1.5 text-2xs font-medium text-brand-700">
              Live Balance: {formatCurrency(liveBalance)}
            </div>
          )}
        </div>
      )}

      {!isPurchased && isNext && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-3xs text-ink-600">
            <span>Funding progress</span>
            <span className="tabular font-medium text-ink-900">
              {Math.max(0, fundedPercent).toFixed(0)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                fundedPercent >= 100 ? "bg-profit" : "bg-brand-600"
              )}
              style={{ width: `${Math.min(100, Math.max(0, fundedPercent))}%` }}
            />
          </div>
        </div>
      )}

      {purchase.notes && (
        <div className="mt-3 text-3xs text-ink-600">{purchase.notes}</div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2">
        {isNext && fundedPercent >= 100 && onBuy && !isPurchased && (
          <Button size="sm" variant="primary" onClick={onBuy} className="w-full mb-2">
            Buy Account Now
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>

        {purchase.status === "planned" && (
          <>
            {fundedPercent >= 100 ? (
              <Button size="sm" variant="ghost" onClick={() => onAdvance("purchased")} leftIcon={<Package className="h-3 w-3" />}>
                Mark purchased
              </Button>
            ) : (
              <span className="text-3xs text-ink-400 px-2 py-1 inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> Needs funding
              </span>
            )}
          </>
        )}

        {purchase.status === "purchased" && (
          <Button size="sm" variant="ghost" onClick={() => onAdvance("active")}>
            Activate
          </Button>
        )}

        {purchase.status === "active" && (
          <Button size="sm" variant="ghost" onClick={() => onAdvance("payout_eligible")}>
            Payout eligible
          </Button>
        )}

        {purchase.status === "payout_eligible" && (
          <Button size="sm" variant="ghost" onClick={() => onAdvance("completed")}>
            Complete
          </Button>
        )}

        {isPurchased && purchase.status !== "lost" && purchase.status !== "archived" && (
          <Button size="sm" variant="ghost" onClick={() => onAdvance("lost")} className="text-loss-text hover:bg-loss-bg">
            Mark lost
          </Button>
        )}

        {(purchase.status === "lost" || purchase.status === "active" || purchase.status === "purchased") && (
          <Button size="sm" variant="ghost" onClick={() => onAdvance("planned")} className="text-ink-500 hover:bg-surface-muted">
            Reset to Planned
          </Button>
        )}
      </div>
    </div>
  );
}
