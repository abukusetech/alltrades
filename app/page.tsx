import Link from "next/link";
import {
  BookOpen,
  ScanSearch,
  ChartNoAxesCombined,
  ShieldCheck,
  ArrowUpRight,
  ClipboardCheck,
  LayoutDashboard,
  ArrowRight,
  Globe,
  TrendingUp,
  Activity,
  Target,
  ShieldAlert,
} from "lucide-react";
import { AlltradesMark } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { LandingWrapper } from "@/components/landing/LandingWrapper";
import { LiveMarketStrip } from "@/components/landing/LiveMarketStrip";

export const metadata = {
  title: "AllTrades — Trade With Precision. Build With Discipline.",
  description: "Professional trading journal and account discipline system.",
};

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Smart Trade Planning",
    text: "Analyze market structure, liquidity, sessions, and trading opportunities before you commit capital.",
    href: "/planning",
  },
  {
    icon: ShieldCheck,
    title: "Precision Risk Management",
    text: "Monitor risk exposure, drawdown, and account protection with strict enforcement.",
    href: "/trade-check",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Performance Analytics",
    text: "Understand your trading statistics and identify weaknesses before they become habits.",
    href: "/analytics",
  },
  {
    icon: BookOpen,
    title: "Trading Journal",
    text: "Track executions, review decisions, and improve consistency with structured journaling.",
    href: "/journal",
  },
];

export default function LandingPage() {
  return (
    <LandingWrapper>
      <div className="min-h-screen bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-100">
        {/* Top bar */}
        <div className="border-b border-border dark:border-ink-800">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5">
              <AlltradesMark className="h-7 w-7 text-brand-600" />
              <span className="text-sm font-semibold tracking-widest text-ink-900 dark:text-white">
                ALLTRADES
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Create account</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border dark:border-ink-800">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50/40 via-transparent to-transparent dark:from-brand-950/20" />
          <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="max-w-3xl">
              <div className="text-3xs font-medium uppercase tracking-[0.2em] text-brand-700 dark:text-brand-400">
                Institutional-grade trading infrastructure
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-900 dark:text-white sm:text-5xl lg:text-6xl">
                Trade Smarter.<br />
                Stay Consistent.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-600 dark:text-ink-400">
                Your trading performance, discipline, and growth — all in one place.
                Precision tools for the funded trader who plays the long game.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/dashboard">
                  <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Enter Dashboard
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline">
                    Explore AllTrades
                  </Button>
                </a>
              </div>
              <p className="mt-4 text-3xs text-ink-500 dark:text-ink-500">
                No broker integration. Every metric derived from your recorded trades.
              </p>
            </div>
          </div>
        </section>

        {/* LIVE MARKET & PERFORMANCE STRIP */}
        <LiveMarketStrip />

        {/* VALUE PROPOSITION */}
        <section id="features" className="border-b border-border dark:border-ink-800 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 max-w-2xl">
              <div className="text-3xs font-medium uppercase tracking-[0.2em] text-brand-700 dark:text-brand-400">
                Built for serious traders
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
                Everything you need. Nothing you don&apos;t.
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <Link
                    key={f.title}
                    href={f.href}
                    className="group rounded-lg border border-border dark:border-ink-800 bg-white dark:bg-ink-900 p-6 transition-all hover:border-brand-300 hover:shadow-card dark:hover:border-brand-700"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 transition-colors group-hover:bg-brand-100 dark:group-hover:bg-brand-900">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-ink-900 dark:text-white">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-2xs leading-relaxed text-ink-600 dark:text-ink-400">
                      {f.text}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-3xs font-medium text-brand-700 dark:text-brand-400">
                      Open
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
              Every trade recorded. Every rule enforced.
            </h2>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-400">
              Join traders who treat their capital like a business, not a gamble.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button size="lg">Create your workspace</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Log in</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border dark:border-ink-800">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
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
    </LandingWrapper>
  );
}

