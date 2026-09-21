import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function RuleExplainer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How the consistency rule works</CardTitle>
        <Badge tone="brand">Instant Funding</Badge>
      </CardHeader>
      <CardBody className="space-y-3 text-2xs leading-relaxed text-ink-600">
        <p>
          The consistency rule caps the share of your total profit that may come
          from any single winning day. If one day accounts for too much of your
          profit, the withdrawal is blocked until the ratio falls back within
          the limit.
        </p>
        <div className="rounded border border-border bg-surface-soft p-3">
          <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
            Formula
          </div>
          <div className="mt-1 font-mono text-xs text-ink-900">
            Biggest winning day ÷ Total profit × 100
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Example
            label="Example — allowed"
            biggest="$1,000"
            total="$5,000"
            score="20.0%"
            tone="profit"
          />
          <Example
            label="Example — blocked"
            biggest="$2,000"
            total="$5,000"
            score="40.0%"
            tone="loss"
          />
        </div>
        <p>
          <strong className="text-ink-900">Required total profit</strong> for a
          20% consistency score is{" "}
          <span className="font-mono">Biggest winning day × 5</span>. Both the
          profit target and the consistency rule must be satisfied before a
          withdrawal can be recorded.
        </p>
      </CardBody>
    </Card>
  );
}

function Example({
  label,
  biggest,
  total,
  score,
  tone,
}: {
  label: string;
  biggest: string;
  total: string;
  score: string;
  tone: "profit" | "loss";
}) {
  return (
    <div
      className={
        tone === "profit"
          ? "rounded border border-profit-border bg-profit-bg p-3"
          : "rounded border border-loss-border bg-loss-bg p-3"
      }
    >
      <div className="text-3xs font-medium uppercase tracking-wide text-ink-600">
        {label}
      </div>
      <div className="mt-1 text-2xs text-ink-700">
        Biggest: <span className="tabular font-medium">{biggest}</span>
        {" · "}
        Total: <span className="tabular font-medium">{total}</span>
      </div>
      <div
        className={
          tone === "profit"
            ? "tabular mt-0.5 text-xs font-semibold text-profit-text"
            : "tabular mt-0.5 text-xs font-semibold text-loss-text"
        }
      >
        Score: {score}
      </div>
    </div>
  );
}
