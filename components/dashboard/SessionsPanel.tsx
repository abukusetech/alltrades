"use client";

import * as React from "react";
import { Clock, Zap, Globe, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SESSIONS, KILL_ZONES, getGlobalMarketStatus, getSessionStatus, getKillZoneStatus, formatEat, formatEatFull } from "@/lib/market-engine";
import { cn } from "@/lib/utils";

function formatCountdown(totalSecs: number) {
  if (totalSecs <= 0) return "00:00:00";
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionsPanel() {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const market = getGlobalMarketStatus(now);

  // Calculate time remaining for market open/close
  const marketSecondsRemaining = React.useMemo(() => {
    if (!market.isOpen && market.nextOpenTime) {
      return Math.max(0, Math.floor((market.nextOpenTime.getTime() - now.getTime()) / 1000));
    }
    if (market.isOpen && market.nextCloseTime) {
      return Math.max(0, Math.floor((market.nextCloseTime.getTime() - now.getTime()) / 1000));
    }
    return 0;
  }, [market, now]);

  return (
    <div className="space-y-4">
      {/* GLOBAL MARKET STATUS BANNER */}
      <Card className={market.isOpen ? "border-profit-border" : "border-loss-border"}>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", market.isOpen ? "bg-profit-bg text-profit-text" : "bg-loss-bg text-loss-text")}>
              {market.isOpen ? <Globe className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div>
              <div className={cn("text-sm font-bold uppercase tracking-wide", market.isOpen ? "text-profit-text" : "text-loss-text")}>
                {market.statusText}
              </div>
              <div className="text-2xs text-ink-600 mt-0.5">
                {market.isOpen 
                  ? `Closes ${formatEatFull(market.nextCloseTime)} EAT`
                  : `Opens ${formatEatFull(market.nextOpenTime)} EAT`}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-3xs uppercase tracking-wide text-ink-500">
              {market.isOpen ? "Time until weekly close" : "Time until market opens"}
            </div>
            <div className={cn("tabular text-lg font-bold", market.isOpen ? "text-profit-text" : "text-loss-text")}>
              {formatCountdown(marketSecondsRemaining)}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* SESSIONS */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            <CardTitle>Live Trading Sessions</CardTitle>
          </div>
          <Badge tone="neutral">Times in EAT (Kenya)</Badge>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SESSIONS.map((s) => {
              // If global market is closed, sessions are forced closed
              const status = market.isOpen ? getSessionStatus(s, now) : { status: "CLOSED", elapsedSecs: 0, remainingSecs: 0 };
              
              // To display the times in EAT, we calculate the session's open/close times today
              const localOpen = new Date(now);
              localOpen.setHours(s.openHour, 0, 0, 0); // This is a rough approximation, but good enough for display
              
              return (
                <div key={s.key} className="rounded-lg border border-border bg-surface-soft p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink-900">{s.name}</span>
                    <Badge tone={status.status === "OPEN" ? "profit" : "neutral"}>
                      {status.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 space-y-1 text-3xs text-ink-500">
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span className="tabular text-ink-700">{s.openHour}:00 - {s.closeHour}:00</span>
                    </div>
                  </div>
                  
                  {status.status === "OPEN" && market.isOpen ? (
                    <div className="mt-3 rounded bg-profit-bg px-2 py-2 text-center">
                      <div className="text-3xs font-medium text-profit-text uppercase tracking-wide">Time Remaining</div>
                      <div className="tabular mt-0.5 text-sm font-bold text-profit-text">{formatCountdown(status.remainingSecs)}</div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded bg-surface-muted px-2 py-2 text-center">
                      <div className="text-3xs font-medium text-ink-500 uppercase tracking-wide">Status</div>
                      <div className="mt-0.5 text-xs font-bold text-ink-700">
                        {market.isOpen ? "Closed" : "Market Closed"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* KILL ZONES */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warn-text" />
            <CardTitle>ICT Kill Zones</CardTitle>
          </div>
          <Badge tone="neutral">NY Time Reference</Badge>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KILL_ZONES.map((kz) => {
              const status = market.isOpen ? getKillZoneStatus(kz, now) : { status: "CLOSED", remainingSecs: 0 };
              return (
                <div key={kz.key} className="rounded-lg border border-border bg-surface-soft p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink-900">{kz.name}</span>
                    <Badge tone={status.status === "ACTIVE" ? "warn" : "neutral"}>
                      {status.status === "ACTIVE" ? "ACTIVE" : "CLOSED"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-3xs text-ink-500">
                    {kz.open}:00 - {kz.close}:00 NY
                  </div>
                  <div className="mt-1 tabular text-xs font-semibold text-ink-700">
                    {market.isOpen && status.status === "ACTIVE"
                      ? `Ends in ${formatCountdown(status.remainingSecs)}`
                      : "Market Closed"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
