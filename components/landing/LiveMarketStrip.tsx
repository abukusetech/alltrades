"use client";

import * as React from "react";
import { Globe, Clock, TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  getGlobalMarketStatus,
  getSessionStatus,
  formatEat,
  formatEatFull,
  SESSIONS,
} from "@/lib/market-engine";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function formatCountdown(totalSecs: number): string {
  if (totalSecs <= 0) return "00:00:00";
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveMarketStrip() {
  const [now, setNow] = React.useState(new Date());

  // Update every second without API calls
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const market = getGlobalMarketStatus(now);

  // Find all currently active sessions
  const activeSessions = React.useMemo(
    () => SESSIONS.filter((s) => getSessionStatus(s, now).status === "OPEN"),
    [now]
  );

  // Find the next session that opens today (if none active)
  const nextSession = React.useMemo(() => {
    if (activeSessions.length > 0) return null;
    // Find the session that will open soonest by checking each session's next open
    // Simple heuristic: check sessions that typically open later in NY time
    const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const nyHour = ny.getHours();
    // Order: Sydney (17-02 NY), Tokyo (19-04 NY), London (03-12 NY), NY (08-17 NY)
    const openOrder = [
      { session: SESSIONS[2], hour: 3 },   // London
      { session: SESSIONS[3], hour: 8 },   // NY
      { session: SESSIONS[0], hour: 17 },  // Sydney
      { session: SESSIONS[1], hour: 19 },  // Tokyo
    ];
    for (const entry of openOrder) {
      if (entry.hour > nyHour) {
        return entry.session;
      }
    }
    return SESSIONS[0];
  }, [now, activeSessions]);

  // Market countdown
  const marketCountdownSecs = React.useMemo(() => {
    if (!market.isOpen && market.nextOpenTime) {
      return Math.max(0, Math.floor((market.nextOpenTime.getTime() - now.getTime()) / 1000));
    }
    if (market.isOpen && market.nextCloseTime) {
      return Math.max(0, Math.floor((market.nextCloseTime.getTime() - now.getTime()) / 1000));
    }
    return 0;
  }, [market, now]);

  return (
    <section className="border-b border-border dark:border-ink-800 bg-surface-soft dark:bg-ink-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-3xs font-medium uppercase tracking-[0.15em] text-ink-500">
            Live Market Overview
          </div>
          <div className="text-3xs text-ink-500 tabular">
            {now.toLocaleTimeString("en-GB", { timeZone: "Africa/Nairobi" })} EAT
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. MARKET STATUS */}
          <Tile
            icon={<Globe className={market.isOpen ? "text-profit-text" : "text-loss-text"} />}
            label="Global Forex Market"
            value={market.statusText}
            tone={market.isOpen ? "profit" : "loss"}
            hint={
              market.isOpen
                ? `Closes ${formatEatFull(market.nextCloseTime)} EAT`
                : `Opens ${formatEatFull(market.nextOpenTime)} EAT`
            }
            extra={
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xs text-ink-500">
                  {market.isOpen ? "Closes in" : "Opens in"}
                </span>
                <span className={cn("tabular text-xs font-semibold", market.isOpen ? "text-profit-text" : "text-loss-text")}>
                  {formatCountdown(marketCountdownSecs)}
                </span>
              </div>
            }
          />

          {/* 2. ACTIVE SESSION(S) */}
          <Tile
            icon={<Clock className="text-brand-600" />}
            label={activeSessions.length > 1 ? "Overlapping Sessions" : "Active Session"}
            value={
              activeSessions.length > 0
                ? activeSessions.map((s) => s.name).join(" + ")
                : "None — Market Closed"
            }
            hint={
              activeSessions.length > 0
                ? activeSessions
                    .map((s) => `${s.openHour}:00–${s.closeHour}:00 ${s.name} time`)
                    .join(" · ")
                : nextSession
                  ? `Next: ${nextSession.name} (${nextSession.openHour}:00 ${nextSession.timezone.split("/")[1]})`
                  : "Awaiting schedule"
            }
            tone={activeSessions.length > 0 ? "profit" : "neutral"}
          />

          {/* 3. ACCOUNT — Honest logged-out state */}
          <Tile
            icon={<TrendingUp className="text-brand-600" />}
            label="Your Trading Account"
            value="Sign in to view"
            tone="neutral"
            hint="Access your live capital, win rate, and trade history"
            extra={
              <Link href="/login">
                <Button size="sm" variant="outline" className="mt-3 w-full" rightIcon={<ArrowRight className="h-3 w-3" />}>
                  Log in
                </Button>
              </Link>
            }
          />

          {/* 4. DISCIPLINE — Feature-oriented (no private data) */}
          <Tile
            icon={<ShieldAlert className="text-brand-600" />}
            label="Trading Discipline"
            value="Enforced Automatically"
            tone="neutral"
            hint="Two-loss weekly limit · Drawdown protection · Rule compliance"
            extra={
              <Link href="/signup">
                <Button size="sm" variant="ghost" className="mt-3 w-full" rightIcon={<ArrowRight className="h-3 w-3" />}>
                  Create account
                </Button>
              </Link>
            }
          />
        </div>

        <p className="mt-6 text-center text-3xs text-ink-500">
          No broker integration. Every metric derived from your recorded trades.
        </p>
      </div>
    </section>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "profit" | "loss";
  extra?: React.ReactNode;
}) {
  const valueClass =
    tone === "profit"
      ? "text-profit-text"
      : tone === "loss"
        ? "text-loss-text"
        : "text-ink-900 dark:text-white";

  return (
    <div className="flex flex-col rounded-lg border border-border dark:border-ink-800 bg-white dark:bg-ink-950 p-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4">{icon}</div>
        <span className="text-3xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </span>
      </div>
      <div className={cn("mt-2 text-sm font-semibold tabular", valueClass)}>{value}</div>
      <div className="mt-1 text-3xs text-ink-500">{hint}</div>
      {extra}
    </div>
  );
}
