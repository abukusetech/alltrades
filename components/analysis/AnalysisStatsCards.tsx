import { Card, CardBody } from "@/components/ui/Card";
import type { AnalysisStats } from "@/lib/calc";
import { formatPercent } from "@/lib/utils";

export function AnalysisStatsCards({ stats }: { stats: AnalysisStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat
        label="Total Analyses"
        value={String(stats.total)}
        hint="All recorded reads"
      />
      <Stat
        label="Pending Reviews"
        value={String(stats.pending)}
        hint="Awaiting outcome"
      />
      <Stat
        label="Correct"
        value={String(stats.correct)}
        hint={
          stats.accuracy != null
            ? `${formatPercent(stats.accuracy, 1)} accuracy`
            : "No resolved reads yet"
        }
      />
      <Stat
        label="Partial"
        value={String(stats.partial)}
        hint="Partially correct reads"
      />
      <Stat
        label="Incorrect"
        value={String(stats.incorrect)}
        hint="Predictions that failed"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardBody className="relative overflow-hidden p-4 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand-500">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{label}</div>
        <div className="tabular mt-2 text-xl font-semibold tracking-tight text-ink-950">
          {value}
        </div>
        <div className="mt-0.5 text-3xs text-ink-500">{hint}</div>
      </CardBody>
    </Card>
  );
}
