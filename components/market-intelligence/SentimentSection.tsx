"use client";

import * as React from "react";
import { Activity, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSentiment } from "@/lib/hooks/useSentiment";
import { cn, formatNumber } from "@/lib/utils";

const TIMEFRAMES = [
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
];

export function SentimentSection() {
  const { data, status, errorMessage } = useSentiment();
  const [timeframe, setTimeframe] = React.useState("1w");

  if (status === "loading") {
    return <Card><CardBody className="text-2xs text-ink-500 py-4">Loading market sentiment…</CardBody></Card>;
  }

  if (status === "error" || !data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-brand-600" /><CardTitle>Sentiment & Positioning</CardTitle></div>
          <Badge tone="loss">Unavailable</Badge>
        </CardHeader>
        <CardBody className="text-2xs text-ink-500">
          <div className="flex items-center gap-2 rounded border border-loss-border bg-loss-bg px-3 py-2 text-loss-text">
            <Info className="h-4 w-4" />
            {errorMessage || "Sentiment data unavailable"}
          </div>
        </CardBody>
      </Card>
    );
  }

  const { goldFng, fngHistory, eurCot, goldCot } = data;

  // Slice F&G history based on timeframe
  const displayHistory = timeframe === "1w" ? fngHistory.slice(0, 7) : fngHistory.slice(0, 30);

  // Helpers
  const getFngColor = (value: number) => {
    if (value < 25) return "text-loss-text";
    if (value < 45) return "text-warn-text";
    if (value < 55) return "text-ink-700";
    return "text-profit-text";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* --- COT INSTITUTIONAL POSITIONING --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-600" />
            <CardTitle>Institutional (COT)</CardTitle>
          </div>
          <Badge tone="neutral">Weekly</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* EUR COT */}
          <div className="rounded border border-border bg-surface-soft p-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-ink-900">EUR Futures</span>
              {eurCot && <span className="text-3xs text-ink-500">{eurCot.reportDate}</span>}
            </div>
            {eurCot ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-3xs text-ink-500">Net</div>
                  <div className={cn("tabular text-xs font-bold", eurCot.netPositions >= 0 ? "text-profit-text" : "text-loss-text")}>
                    {eurCot.netPositions > 0 ? "+" : ""}{formatNumber(eurCot.netPositions, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-3xs text-ink-500">Longs</div>
                  <div className="tabular text-xs font-medium text-ink-700">{formatNumber(eurCot.longPositions, 0)}</div>
                </div>
                <div>
                  <div className="text-3xs text-ink-500">Shorts</div>
                  <div className="tabular text-xs font-medium text-ink-700">{formatNumber(eurCot.shortPositions, 0)}</div>
                </div>
                {eurCot.changeFromPrevious !== null && (
                  <div className="col-span-3 mt-1 flex items-center gap-1 text-3xs">
                    {eurCot.changeFromPrevious >= 0 ? <TrendingUp className="h-3 w-3 text-profit-text" /> : <TrendingDown className="h-3 w-3 text-loss-text" />}
                    <span className={eurCot.changeFromPrevious >= 0 ? "text-profit-text" : "text-loss-text"}>
                      {eurCot.changeFromPrevious > 0 ? "+" : ""}{formatNumber(eurCot.changeFromPrevious, 0)} vs prior week
                    </span>
                  </div>
                )}
              </div>
            ) : <div className="mt-2 text-3xs text-ink-500">Data unavailable</div>}
          </div>

          {/* GOLD COT */}
          <div className="rounded border border-border bg-surface-soft p-3">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-ink-900">Gold Futures</span>
              {goldCot && <span className="text-3xs text-ink-500">{goldCot.reportDate}</span>}
            </div>
            {goldCot ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-3xs text-ink-500">Net</div>
                  <div className={cn("tabular text-xs font-bold", goldCot.netPositions >= 0 ? "text-profit-text" : "text-loss-text")}>
                    {goldCot.netPositions > 0 ? "+" : ""}{formatNumber(goldCot.netPositions, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-3xs text-ink-500">Longs</div>
                  <div className="tabular text-xs font-medium text-ink-700">{formatNumber(goldCot.longPositions, 0)}</div>
                </div>
                <div>
                  <div className="text-3xs text-ink-500">Shorts</div>
                  <div className="tabular text-xs font-medium text-ink-700">{formatNumber(goldCot.shortPositions, 0)}</div>
                </div>
                {goldCot.changeFromPrevious !== null && (
                  <div className="col-span-3 mt-1 flex items-center gap-1 text-3xs">
                    {goldCot.changeFromPrevious >= 0 ? <TrendingUp className="h-3 w-3 text-profit-text" /> : <TrendingDown className="h-3 w-3 text-loss-text" />}
                    <span className={goldCot.changeFromPrevious >= 0 ? "text-profit-text" : "text-loss-text"}>
                      {goldCot.changeFromPrevious > 0 ? "+" : ""}{formatNumber(goldCot.changeFromPrevious, 0)} vs prior week
                    </span>
                  </div>
                )}
              </div>
            ) : <div className="mt-2 text-3xs text-ink-500">Data unavailable</div>}
          </div>
          <p className="text-3xs text-ink-400">Source: CFTC · Weekly (Friday, for prior Tuesday)</p>
        </CardBody>
      </Card>

      {/* --- GOLD FEAR & GREED --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-600" />
            <CardTitle>Gold Fear & Greed</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="h-7 rounded border border-border-strong bg-white px-2 text-2xs dark:bg-ink-900"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          {goldFng ? (
            <>
              <div className="flex items-center gap-4">
                <div className={cn("tabular text-4xl font-bold", getFngColor(goldFng.value))}>
                  {goldFng.value}
                </div>
                <div>
                  <div className={cn("text-sm font-semibold", getFngColor(goldFng.value))}>{goldFng.classification}</div>
                  <div className="text-3xs text-ink-500">As of {new Date(goldFng.timestamp).toLocaleDateString("en-GB")}</div>
                </div>
              </div>

              {/* Mini history strip */}
              <div className="flex gap-1 h-12 items-end mt-2">
                {displayHistory.slice().reverse().map((h, i) => (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-t-sm", getFngColor(h.value).replace("text-", "bg-"))}
                    style={{ height: `${h.value}%` }}
                    title={`${h.classification} (${h.value})`}
                  />
                ))}
              </div>

              {/* Reference Legend */}
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-3xs">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-loss" /><span className="text-ink-600">0-24 Extreme Fear</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" /><span className="text-ink-600">25-44 Fear</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-400" /><span className="text-ink-600">45-55 Neutral</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-profit" /><span className="text-ink-600">56+ Greed</span></div>
              </div>
            </>
          ) : (
            <div className="text-2xs text-ink-500">Not available</div>
          )}
          <p className="text-3xs text-ink-400">Source: alternative.me · Daily update</p>
        </CardBody>
      </Card>
    </div>
  );
}

