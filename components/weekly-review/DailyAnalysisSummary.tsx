"use client";

import * as React from "react";
import { Sunrise } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useDailyAnalysesHistory } from "@/lib/data/daily-analysis-hooks";
import { summarizeDailyAnalysisWeek } from "@/lib/daily-analysis-calc";
import { formatPercent } from "@/lib/utils";

export function DailyAnalysisSummary({
  accountId,
  weekStart,
  weekEnd,
  tradesCount,
}: {
  accountId: string | null;
  weekStart: string;
  weekEnd: string;
  tradesCount: number;
}) {
  const { data: allAnalyses = [] } = useDailyAnalysesHistory(accountId, 90);

  const analysesThisWeek = React.useMemo(() => {
    return allAnalyses.filter(
      (a) => a.analysis_date >= weekStart && a.analysis_date <= weekEnd
    );
  }, [allAnalyses, weekStart, weekEnd]);

  const summary = React.useMemo(
    () => summarizeDailyAnalysisWeek(analysesThisWeek, tradesCount),
    [analysesThisWeek, tradesCount]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-brand-600" />
          <CardTitle>Daily Analysis Summary</CardTitle>
        </div>
        <Badge tone="neutral">{summary.days} analysis day{summary.days === 1 ? "" : "s"}</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Analysis days" value={String(summary.days)} />
          <Stat label="Valid setups" value={String(summary.validSetups)} />
          <Stat label="Trades" value={String(summary.trades)} />
          <Stat label="No-trade days" value={String(summary.noTradeDays)} />
          <Stat label="Correct" value={String(summary.correctCount)} />
          <Stat label="Partially" value={String(summary.partiallyCount)} />
          <Stat label="Incorrect" value={String(summary.incorrectCount)} />
          <Stat
            label="Correct %"
            value={summary.correctPercent !== null ? formatPercent(summary.correctPercent, 1) : "—"}
          />
          <Stat
            label="Avg RR"
            value={summary.averageRR !== null ? `1:${summary.averageRR.toFixed(2)}` : "—"}
          />
          <Stat
            label="Avg risk"
            value={summary.averageRiskPercent !== null ? formatPercent(summary.averageRiskPercent, 2) : "—"}
          />
          <Stat
            label="Followed plan"
            value={summary.followedPlanPercent !== null ? formatPercent(summary.followedPlanPercent, 0) : "—"}
          />
          <Stat label="Most common mistake" value={summary.mostCommonMistake ?? "—"} />
        </div>

        {summary.days > 0 && (
          <div className="mt-5 rounded border border-border bg-surface-soft px-3 py-2 text-2xs">
            <span className="text-ink-600">Did I follow my plan this week? </span>
            <span className={summary.followedPlanPercent !== null && summary.followedPlanPercent >= 50 ? "font-semibold text-profit-text" : "font-semibold text-warn-text"}>
              {summary.followedPlanPercent !== null
                ? `${formatPercent(summary.followedPlanPercent, 0)} of days`
                : "—"}
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="tabular mt-0.5 text-xs font-semibold text-ink-900">{value}</div>
    </div>
  );
}
