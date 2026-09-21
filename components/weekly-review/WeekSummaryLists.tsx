import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { WeeklyAggregate } from "@/lib/calc";
import { cn } from "@/lib/utils";

export interface WeekSummaryListsProps {
  week: WeeklyAggregate;
}

export function WeekSummaryLists({ week }: WeekSummaryListsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Strategies used</CardTitle>
          <Badge tone="neutral">{week.strategiesUsed.length}</Badge>
        </CardHeader>
        <CardBody>
          {week.strategiesUsed.length === 0 ? (
            <Empty text="No strategies recorded this week." />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {week.strategiesUsed.map((s) => (
                <li
                  key={s}
                  className="rounded border border-border bg-surface-soft px-2 py-1 text-2xs text-ink-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruments traded</CardTitle>
          <Badge tone="neutral">{week.instrumentsTraded.length}</Badge>
        </CardHeader>
        <CardBody>
          {week.instrumentsTraded.length === 0 ? (
            <Empty text="No instruments recorded this week." />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {week.instrumentsTraded.map((s) => (
                <li
                  key={s}
                  className="rounded border border-border bg-surface-soft px-2 py-1 text-2xs text-ink-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common mistakes</CardTitle>
          <Badge tone={week.mistakes.length > 0 ? "warn" : "neutral"}>
            {week.mistakes.length}
          </Badge>
        </CardHeader>
        <CardBody>
          {week.mistakes.length === 0 ? (
            <Empty text="No mistakes logged this week." />
          ) : (
            <ul className="space-y-1.5">
              {week.mistakes.map((m, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text"
                  )}
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emotional patterns</CardTitle>
          <Badge tone={week.emotions.length > 0 ? "brand" : "neutral"}>
            {week.emotions.length}
          </Badge>
        </CardHeader>
        <CardBody>
          {week.emotions.length === 0 ? (
            <Empty text="No emotional notes recorded this week." />
          ) : (
            <ul className="space-y-1.5">
              {week.emotions.map((m, i) => (
                <li
                  key={i}
                  className="rounded border border-border bg-surface-soft px-3 py-2 text-2xs text-ink-700"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-2xs text-ink-500">{text}</p>;
}
