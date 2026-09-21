import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Trade } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface RecentTradesCardProps {
  trades: Trade[];
}

export function RecentTradesCard({ trades }: RecentTradesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
        <Link href="/journal">
          <Button variant="ghost" size="sm">
            Open Journal
          </Button>
        </Link>
      </CardHeader>

      {trades.length === 0 ? (
        <CardBody>
          <EmptyState
            icon={<BookOpen className="h-4 w-4" />}
            title="No trades recorded"
            description="Use New Trade to record your first trade."
            compact
          />
        </CardBody>
      ) : (
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {trades.map((t) => {
              const pl = Number(t.profit_loss) || 0;
              const plClass =
                pl > 0
                  ? "text-profit-text"
                  : pl < 0
                    ? "text-loss-text"
                    : "text-ink-600";
              const tone =
                t.result === "Win"
                  ? "profit"
                  : t.result === "Loss"
                    ? "loss"
                    : "neutral";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-ink-900">
                        {t.instrument}
                      </span>
                      <Badge tone={tone}>{t.result}</Badge>
                    </div>
                    <div className="mt-0.5 text-3xs text-ink-500">
                      {t.trade_date}
                      {t.direction ? ` · ${t.direction}` : ""}
                      {t.strategy ? ` · ${t.strategy}` : ""}
                    </div>
                  </div>
                  <div className={`tabular text-sm font-semibold ${plClass}`}>
                    {formatCurrency(pl, { showSign: true })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      )}
    </Card>
  );
}
