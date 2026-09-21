import Link from "next/link";
import {
  BookOpen,
  ScanSearch,
  ChartNoAxesCombined,
  ShieldCheck,
  ArrowUpRight,
  ClipboardCheck,
  LayoutDashboard,
  CalendarDays,
} from "lucide-react";
import { AlltradesMark } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Trading journal",
    text: "Record every trade with market, setup and psychology detail.",
  },
  {
    icon: ScanSearch,
    title: "Market analysis",
    text: "Capture your market read before execution, then review it after the move.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Account performance",
    text: "See current capital, win rate and profit factor computed from your trades.",
  },
  {
    icon: ShieldCheck,
    title: "Consistency monitoring",
    text: "Instant Funding consistency score with a clear withdrawal gate.",
  },
  {
    icon: ArrowUpRight,
    title: "Withdrawal tracking",
    text: "4% target, progress and history tied to each account.",
  },
  {
    icon: CalendarDays,
    title: "Calendar & analytics",
    text: "Daily P/L, break down by instrument and strategy, weekly review.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AlltradesMark className="h-7 w-7 text-brand-600" />
            <span className="text-sm font-semibold tracking-wide text-ink-900">
              ALLTRADES
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Create account</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="max-w-2xl">
          <div className="text-3xs font-medium uppercase tracking-wider text-brand-700">
            Trading journal and account discipline system
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Record every trade. Track every rule. Withdraw with confidence.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            ALLTRADES is a workspace for funded traders. Log trades and market
            reads, monitor current capital, watch daily and trailing drawdown
            limits, track consistency against the 20% rule and manage
            withdrawals — all calculated from the data you enter.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <Button size="lg">Create your workspace</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Log in
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-3xs text-ink-500">
            No broker integration. Everything is calculated from your recorded
            trades and account settings.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardBody className="space-y-2">
                  <Icon className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-ink-900">
                    {f.title}
                  </h3>
                  <p className="text-2xs leading-relaxed text-ink-600">
                    {f.text}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Product preview */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-lg border border-border bg-surface-soft p-6">
          <div className="mb-4 flex items-center gap-2 text-3xs font-medium uppercase tracking-wider text-ink-500">
            <LayoutDashboard className="h-3.5 w-3.5" />
            What you get on day one
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PreviewMetric label="Current Capital" value="$0.00" />
            <PreviewMetric label="Total P/L" value="$0.00" />
            <PreviewMetric label="Consistency Score" value="0%" />
            <PreviewMetric label="Weekly Trades" value="0 / 3" />
          </div>
          <p className="mt-4 max-w-2xl text-2xs text-ink-500">
            Numbers above reflect an empty workspace. Once you record trades,
            every metric is derived from your entries — never invented.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-3xs text-ink-500">
            <AlltradesMark className="h-5 w-5 text-brand-600" />
            ALLTRADES — Trading journal and account discipline system.
          </div>
          <div className="flex items-center gap-3 text-3xs text-ink-500">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Data is private to your account.
          </div>
        </div>
      </footer>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="eyebrow">{label}</div>
      <div className="metric mt-1 text-ink-900">{value}</div>
    </div>
  );
}
