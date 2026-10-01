"use client";

import * as React from "react";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { DailyAnalysis } from "@/lib/types";
import { computeReadiness } from "@/lib/readiness";

const STATUS_LABEL: Record<
  ReturnType<typeof computeReadiness>["status"],
  string
> = {
  INCOMPLETE: "Analysis Incomplete",
  ANALYSIS_READY: "Analysis Ready",
  SETUP_WAITING: "Setup Waiting",
  TRADE_READY: "Trade Ready",
};

const STATUS_TONE: Record<
  ReturnType<typeof computeReadiness>["status"],
  "neutral" | "brand" | "profit" | "warn"
> = {
  INCOMPLETE: "neutral",
  ANALYSIS_READY: "brand",
  SETUP_WAITING: "warn",
  TRADE_READY: "profit",
};

export function ReadinessPanel({ analysis }: { analysis: DailyAnalysis }) {
  const report = React.useMemo(() => computeReadiness(analysis), [analysis]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Readiness</CardTitle>
        <Badge tone={STATUS_TONE[report.status]}>{STATUS_LABEL[report.status]}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xs font-medium text-ink-900">
              READINESS: {report.percent}%
            </div>
            <div className="text-3xs text-ink-500">
              {report.complete} / {report.total} conditions complete
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full transition-all",
                report.status === "TRADE_READY"
                  ? "bg-profit"
                  : report.status === "INCOMPLETE"
                    ? "bg-ink-400"
                    : "bg-brand-600"
              )}
              style={{ width: `${report.percent}%` }}
            />
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-3">
          {report.groups.map((group) => {
            const groupItems = report.items.filter((i) => i.group === group.group);
            return (
              <div key={group.group}>
                <div className="flex items-center justify-between text-3xs uppercase tracking-wide text-ink-500">
                  <span>{group.label}</span>
                  <span className="tabular">
                    {group.complete}/{group.total}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {groupItems.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-start gap-2 text-2xs"
                    >
                      {item.complete ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-profit-text" />
                      ) : (
                        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-ink-800",
                            !item.complete && "text-ink-600"
                          )}
                        >
                          {item.label}
                        </div>
                        {!item.complete && item.hint && (
                          <div className="mt-0.5 text-3xs text-warn-text">
                            {item.hint}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {report.status === "TRADE_READY" && (
          <div className="flex items-center gap-2 rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">
              All predefined conditions satisfied
            </span>
          </div>
        )}
        {report.status === "INCOMPLETE" && (
          <div className="flex items-center gap-2 rounded border border-border bg-surface-soft px-3 py-2 text-2xs text-ink-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Complete your morning analysis to raise readiness.</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

