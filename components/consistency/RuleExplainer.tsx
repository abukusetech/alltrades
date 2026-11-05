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
          from any single winning day. Losing days reduce your total profit, so
          they can bring the score down toward the 20% limit — or push the
          account below zero, in which case the score shows N/A.
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
            label="Example — passed"
            biggest="$20"
            total="$100"
            score="20.0%"
            tone="profit"
          />
          <Example
            label="Example — not passed"
            biggest="$50"
            total="$80"
            score="62.5%"
            tone="loss"
          />
        </div>
        <div className="rounded border border-border bg-surface-soft p-3">
          <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
            Additional profit needed
          </div>
          <div className="mt-1 font-mono text-xs text-ink-900">
            (Biggest winning day ÷ 0.20) − Total net profit
          </div>
          <p className="mt-1 text-3xs text-ink-500">
            The result never goes below $0.00. This assumes the biggest
            winning day does not change — if a new biggest winning day
            appears, the target and the required amount recalculate
            automatically.
          </p>
        </div>
        <p>
          <strong className="text-ink-900">Passed</strong> means the score is at
          or below 20%.{" "}
          <strong className="text-ink-900">Not passed</strong> means the score
          exceeds 20% — a withdrawal is blocked until it comes down. When total
          profit is zero or negative, the score shows <strong>N/A</strong> and a
          withdrawal is not available.
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
        Total profit: <span className="tabular font-medium">{total}</span>
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

