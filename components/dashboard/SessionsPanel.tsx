"use client";

import * as React from "react";
import { Clock, Zap, AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SESSIONS, KILL_ZONES, calculateSessionStatus, formatSecs, getNyTimeParts } from "@/lib/sessions";
import { cn } from "@/lib/utils";

export function SessionsPanel() {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Check if Forex market is open globally
  const nyDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayOfWeek = nyDate.getDay();
  const nyHours = nyDate.getHours();
  
  const isWeekend = 
    (dayOfWeek === 6) || 
    (dayOfWeek === 0 && nyHours < 17) || 
    (dayOfWeek === 5 && nyHours >= 17);

  const isMarketOpen = !isWeekend;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            <CardTitle>Live Trading Sessions</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={isMarketOpen ? "profit" : "loss"}>
              {isMarketOpen ? "Forex Market is OPEN" : "Forex Market is CLOSED (Weekend)"}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SESSIONS.map((s) => {
              const data = calculateSessionStatus(s.openHour, s.closeHour, now);
              
              return (
                <div key={s.key} className="rounded-lg border border-border bg-surface-soft p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink-900">{s.name}</span>
                    <Badge tone={data.status === "OPEN" ? "profit" : "neutral"}>
                      {data.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 space-y-1 text-3xs text-ink-500">
                    <div className="flex justify-between">
                      <span>Open/Close:</span>
                      <span className="tabular text-ink-700">{s.openTimeStr} - {s.closeTimeStr}</span>
                    </div>
                  </div>
                  
                  {data.status === "OPEN" ? (
                    <div className="mt-4 rounded bg-profit-bg px-2 py-2 text-center">
                      <div className="text-3xs font-medium text-profit-text uppercase tracking-wide">Time Remaining</div>
                      <div className="tabular mt-0.5 text-sm font-bold text-profit-text">{formatSecs(data.remainingSecs)}</div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded bg-surface-muted px-2 py-2 text-center">
                      <div className="text-3xs font-medium text-ink-500 uppercase tracking-wide">Status</div>
                      <div className="mt-0.5 text-xs font-bold text-ink-700">
                        {isWeekend ? "Market Closed" : `Next Open In ${formatSecs(data.nextOpenSecs)}`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warn-text" />
            <CardTitle>ICT Kill Zones</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KILL_ZONES.map((kz) => {
              const data = calculateSessionStatus(kz.openHour, kz.closeHour, now);
              return (
                <div key={kz.key} className="rounded-lg border border-border bg-surface-soft p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink-900">{kz.name}</span>
                    <Badge tone={data.status === "OPEN" ? "warn" : "neutral"}>
                      {data.status === "OPEN" ? "ACTIVE" : "CLOSED"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-3xs text-ink-500">
                    {kz.openTimeStr} - {kz.closeTimeStr}
                  </div>
                  <div className="mt-1 tabular text-xs font-semibold text-ink-700">
                    {isWeekend 
                      ? "Market Closed"
                      : data.status === "OPEN" 
                        ? `Ends in ${formatSecs(data.remainingSecs)}` 
                        : `Opens in ${formatSecs(data.nextOpenSecs)}`}
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
