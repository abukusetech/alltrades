"use client";

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ClockZone = {
  key: string;
  label: string;
  tz: string;
  color: string;
};

const ZONES: ClockZone[] = [
  { key: "tokyo", label: "Tokyo", tz: "Asia/Tokyo", color: "text-brand-600" },
  { key: "london", label: "London", tz: "Europe/London", color: "text-profit-text" },
  { key: "newyork", label: "New York", tz: "America/New_York", color: "text-warn-text" },
  { key: "kenya", label: "Kenya", tz: "Africa/Nairobi", color: "text-loss-text" },
];

function getTimeParts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";

  return {
    hours: parseInt(get("hour"), 10) || 0,
    minutes: parseInt(get("minute"), 10) || 0,
    seconds: parseInt(get("second"), 10) || 0,
    weekday: get("weekday"),
    day: get("day"),
    month: get("month"),
    year: get("year"),
    timeString: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

function AnalogClock({ hours, minutes, seconds }: { hours: number; minutes: number; seconds: number }) {
  // Continuous second hand: blend seconds + fractional minutes for smooth movement
  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24">
      {/* Face */}
      <circle cx="50" cy="50" r="48" className="fill-white dark:fill-ink-950 stroke-border-strong" strokeWidth="1" />
      {/* Hour markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const isMajor = i % 3 === 0;
        const r1 = isMajor ? 38 : 41;
        const r2 = 45;
        const rad = (deg - 90) * (Math.PI / 180);
        const x1 = 50 + r1 * Math.cos(rad);
        const y1 = 50 + r1 * Math.sin(rad);
        const x2 = 50 + r2 * Math.cos(rad);
        const y2 = 50 + r2 * Math.sin(rad);
        return (
          <line
            key={deg}
            x1={x1} y1={y1} x2={x2} y2={y2}
            className="stroke-ink-600"
            strokeWidth={isMajor ? 1.8 : 0.8}
            strokeLinecap="round"
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1="50" y1="50"
        x2={50 + 22 * Math.sin((hourAngle * Math.PI) / 180)}
        y2={50 - 22 * Math.cos((hourAngle * Math.PI) / 180)}
        className="stroke-ink-900"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="50" y1="50"
        x2={50 + 32 * Math.sin((minuteAngle * Math.PI) / 180)}
        y2={50 - 32 * Math.cos((minuteAngle * Math.PI) / 180)}
        className="stroke-ink-900"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1="50" y1="50"
        x2={50 + 36 * Math.sin((secondAngle * Math.PI) / 180)}
        y2={50 - 36 * Math.cos((secondAngle * Math.PI) / 180)}
        className="stroke-loss"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="2.5" className="fill-ink-900" />
    </svg>
  );
}

export function WorldClocks() {
  const [now, setNow] = React.useState(new Date());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>World Clocks</CardTitle>
        <Badge tone="neutral">Live</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ZONES.map((zone) => {
            const time = getTimeParts(now, zone.tz);
            return (
              <div
                key={zone.key}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-soft p-4"
              >
                <div className={`text-3xs font-medium uppercase tracking-wide ${zone.color}`}>
                  {zone.label}
                </div>
                <AnalogClock
                  hours={time.hours}
                  minutes={time.minutes}
                  seconds={mounted ? time.seconds : 0}
                />
                <div className="tabular text-sm font-semibold text-ink-900">
                  {mounted ? time.timeString : "—:—:—"}
                </div>
                <div className="text-3xs text-ink-500">
                  {mounted ? `${time.weekday}, ${time.day} ${time.month} ${time.year}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
