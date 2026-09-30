"use client";

import * as React from "react";
import Link from "next/link";
import { Sunrise } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDailyAnalysis } from "@/lib/data/daily-analysis-hooks";
import { computeConfirmationScore, deriveStatus } from "@/lib/daily-analysis-calc";
import { toDateKey } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  ANALYSIS_CREATED: "Analysis Created",
  WAITING_FOR_CONFIRMATION: "Waiting for Confirmation",
  SETUP_CONFIRMED: "Setup Confirmed",
  INVALIDATED: "Invalidated",
  NO_TRADE: "No Trade",
  TRADE_TAKEN: "Trade Taken",
};

const STATUS_TONE: Record<
  string,
  "neutral" | "brand" | "profit" | "loss" | "warn"
> = {
  ANALYSIS_CREATED: "brand",
  WAITING_FOR_CONFIRMATION: "warn",
  SETUP_CONFIRMED: "profit",
  INVALIDATED: "loss",
  NO_TRADE: "neutral",
  TRADE_TAKEN: "profit",
};

export function TodaysAnalysisWidget({
  accountId,
}: {
  accountId: string | null;
}) {
  const today = toDateKey(new Date());
  const { data: analysis, isLoading } = useDailyAnalysis(accountId, today);

  const status = analysis ? deriveStatus(analysis) : "ANALYSIS_CREATED";
  const score = analysis?.confirmation_checklist
    ? computeConfirmationScore(analysis.confirmation_checklist)
    : { checked: 0, total: 10, percent: 0, allChecked: false };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-brand-600" />
          <CardTitle>Today's Analysis</CardTitle>
        </div>
        <Badge tone={STATUS_TONE[status] ?? "neutral"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        {!accountId ? (
          <p className="text-2xs text-ink-500">No account selected.</p>
        ) : isLoading ? (
          <p className="text-2xs text-ink-500">Loading…</p>
        ) : !analysis ? (
          <>
            <p className="text-2xs text-ink-500">
              You haven't created today's analysis yet.
            </p>
            <Link href="/daily-analysis">
              <Button size="sm">Open Daily Analysis</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-2xs">
              <span className="text-ink-600">Confirmation</span>
              <span className="tabular font-semibold text-ink-900">
                {score.checked}/{score.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={
                  score.allChecked ? "h-full bg-profit" : "h-full bg-brand-600"
                }
                style={{ width: `${score.percent}%` }}
              />
            </div>
            {analysis.planned_direction && (
              <div className="text-2xs text-ink-600">
                Plan: <span className="font-medium text-ink-900">{analysis.planned_direction}</span>
              </div>
            )}
            <Link href={`/daily-analysis?date=${analysis.analysis_date}`}>
              <Button variant="outline" size="sm">
                Open today's analysis
              </Button>
            </Link>
          </>
        )}
      </CardBody>
    </Card>
  );
}
