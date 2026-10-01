"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Plus,
} from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { useDailyAnalysis, useDailyAnalysesHistory } from "@/lib/data/daily-analysis-hooks";
import {
  getDailyAnalysis,
  upsertDailyAnalysis,
  updateDailyAnalysis,
  type DailyAnalysisInsert,
} from "@/lib/data/daily-analyses";
import {
  DEFAULT_CHECKLIST,
  DEFAULT_KEY_LEVELS,
  DEFAULT_SCENARIOS,
  DEFAULT_LIQUIDITY,
  DEFAULT_END_OF_DAY,
  DEFAULT_TF,
  computeConfirmationScore,
  computeRR,
  computeRiskAmount,
  computeExpectedProfit,
  pipsFromPrices,
  computeAnalysisAccuracy,
  deriveStatus,
} from "@/lib/daily-analysis-calc";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountHeader } from "@/components/layout/AccountHeader";
import { ReadinessPanel } from "./ReadinessPanel";
import { LinkedTradeBanner } from "./LinkedTradeBanner";
import { TagPicker } from "@/components/ui/TagPicker";
import {
  BIAS_TAGS,
  STRUCTURE_TAGS,
  LIQUIDITY_TAGS,
  SETUP_TAGS,
  SESSION_TAGS,
  NEWS_TAGS,
} from "@/lib/tags";
import { computePipelineStage } from "@/lib/readiness";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { BlockLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  cn,
  formatCurrency,
  formatDateLong,
  formatPercent,
  parseNumberOrNull,
  toDateKey,
} from "@/lib/utils";
import { useWithdrawals, useTrades } from "@/lib/data/hooks";
import { computeAccountMetrics } from "@/lib/calc";
import type {
  DailyAnalysis,
  KeyLevel,
  Scenario,
  ChecklistItem,
  TimeframeAnalysis,
  LiquidityPlan,
  EndOfDayReview,
  DirectionOption,
} from "@/lib/types";

const MISTAKE_OPTIONS = [
  "Entered too early",
  "Entered late",
  "FOMO",
  "Revenge trade",
  "Over-risked",
  "Moved SL",
  "Closed TP early",
  "Ignored confirmation",
  "Traded news",
  "Took second trade",
  "Ignored market structure",
  "Poor RR",
  "Wrong lot size",
  "Emotional entry",
  "No mistake",
] as const;

const STATUS_LABEL: Record<string, string> = {
  ANALYSIS_CREATED: "🔵 Analysis Created",
  WAITING_FOR_CONFIRMATION: "🟡 Waiting for Confirmation",
  SETUP_CONFIRMED: "🟢 Setup Confirmed",
  INVALIDATED: "🔴 Invalidated",
  NO_TRADE: "⚪ No Trade",
  TRADE_TAKEN: "✓ Trade Taken",
};

const STATUS_TONE: Record<
  string,
  "neutral" | "brand" | "profit" | "loss" | "warn"
> = {
  ANALYSIS_CREATED: "brand",
  WAITING_FOR_CONFIRMATION: "warn",
  SETUP_CONFIRMED: "profit",
  INVALIDATED: "loss",
  NO_TRADE: "neutral",
  TRADE_TAKEN: "profit",
};

export function DailyAnalysisClient() {
  const { currentAccount, currentAccountId } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

 const searchParams = useSearchParams();
const initialDate = searchParams.get("date");
const [date, setDate] = React.useState(
  () => initialDate ?? toDateKey(new Date())
);
  const { data: existing, isLoading, mutate } = useDailyAnalysis(
    currentAccountId,
    date
  );
  const { data: history = [] } = useDailyAnalysesHistory(currentAccountId, 60);

  // Local working copy
  const [analysis, setAnalysis] = React.useState<DailyAnalysis | null>(null);
  const [saveState, setSaveState] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Other data for the header
  const { data: trades = [] } = useTrades(currentAccountId);
  const { data: withdrawals = [] } = useWithdrawals(currentAccountId);
  const metrics = React.useMemo(
    () => computeAccountMetrics(currentAccount, trades, withdrawals),
    [currentAccount, trades, withdrawals]
  );

  // ---- Bootstrap ----
  React.useEffect(() => {
    if (!existing) {
      setAnalysis(null);
      return;
    }
    setAnalysis(existing);
  }, [existing]);

  // Debounced save
  const saveTimer = React.useRef<number | null>(null);
  const lastSerialized = React.useRef<string>("");

  const persist = React.useCallback(
    async (a: DailyAnalysis) => {
      if (!currentAccountId) return;

      setSaveState("saving");
      try {
        const payload: DailyAnalysisInsert = {
          account_id: currentAccountId,
          analysis_date: a.analysis_date,
          instrument: a.instrument || "EURUSD",
          higher_timeframe_bias: a.higher_timeframe_bias,
          market_structure: a.market_structure,
          primary_direction: a.primary_direction,
          confidence: a.confidence,
          analysis_notes: a.analysis_notes,
          tf_4h: a.tf_4h,
          tf_1h: a.tf_1h,
          tf_15m: a.tf_15m,
          tf_5m: a.tf_5m,
          key_levels: a.key_levels,
          liquidity: a.liquidity,
          expected_move: a.expected_move,
          invalidation: a.invalidation,
          scenarios: a.scenarios,
          news_major: a.news_major,
          news_time: a.news_time,
          news_currency: a.news_currency,
          news_notes: a.news_notes,
          confirmation_checklist: a.confirmation_checklist,
          planned_direction: a.planned_direction,
          planned_entry: a.planned_entry,
          planned_stop_loss: a.planned_stop_loss,
          planned_take_profit: a.planned_take_profit,
          planned_sl_pips: a.planned_sl_pips,
          planned_risk_percent: a.planned_risk_percent,
          planned_risk_amount: a.planned_risk_amount,
          planned_rr: a.planned_rr,
          planned_expected_profit: a.planned_expected_profit,
          status: a.status,
          actual_high: a.actual_high,
          actual_low: a.actual_low,
          actual_direction: a.actual_direction,
          actual_entry: a.actual_entry,
          actual_movement: a.actual_movement,
          market_outcome: a.market_outcome,
          followed_analysis: a.followed_analysis,
          analysis_result: a.analysis_result,
          analysis_accuracy: a.analysis_accuracy,
          analysis_review_notes: a.analysis_review_notes,
          mistakes: a.mistakes,
          lesson: a.lesson,
          end_of_day_review: a.end_of_day_review,
        };

        if (a.id) {
          await updateDailyAnalysis(supabase, a.id, payload);
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Not signed in");
          const created = await upsertDailyAnalysis(supabase, user.id, payload);
          setAnalysis((prev) => (prev ? { ...prev, id: created.id } : prev));
        }

        lastSerialized.current = JSON.stringify(a);
        setSaveState("saved");
        void mutate();
      } catch (e) {
        console.error("[ALLTRADES] daily analysis save failed", e);
        setSaveState("error");
        toast.error("Could not save", e instanceof Error ? e.message : undefined);
      }
    },
    [currentAccountId, supabase, mutate, toast]
  );

  const update = React.useCallback(
    (patch: Partial<DailyAnalysis>) => {
      setAnalysis((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          void persist(next);
        }, 1200);
        return next;
      });
    },
    [persist]
  );

  // ---- Create a blank analysis for today ----
  const createBlank = React.useCallback(async () => {
    if (!currentAccountId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const blank: DailyAnalysisInsert = {
      account_id: currentAccountId,
      analysis_date: date,
      instrument: "EURUSD",
      higher_timeframe_bias: null,
      market_structure: null,
      primary_direction: null,
      confidence: null,
      analysis_notes: null,
      tf_4h: DEFAULT_TF,
      tf_1h: DEFAULT_TF,
      tf_15m: DEFAULT_TF,
      tf_5m: DEFAULT_TF,
      key_levels: DEFAULT_KEY_LEVELS,
      liquidity: DEFAULT_LIQUIDITY,
      expected_move: null,
      invalidation: null,
      scenarios: DEFAULT_SCENARIOS,
      news_major: false,
      news_time: null,
      news_currency: null,
      news_notes: null,
      confirmation_checklist: DEFAULT_CHECKLIST,
      planned_direction: null,
      planned_entry: null,
      planned_stop_loss: null,
      planned_take_profit: null,
      planned_sl_pips: null,
      planned_risk_percent: 0.25,
      planned_risk_amount: 0,
      planned_rr: null,
      planned_expected_profit: null,
      status: "ANALYSIS_CREATED",
      actual_high: null,
      actual_low: null,
      actual_direction: null,
      actual_entry: null,
      actual_movement: null,
      market_outcome: null,
      followed_analysis: null,
      analysis_result: null,
      analysis_accuracy: null,
      analysis_review_notes: null,
      mistakes: null,
      lesson: null,
      end_of_day_review: DEFAULT_END_OF_DAY,
    };

    try {
      const created = await upsertDailyAnalysis(supabase, user.id, blank);
      setAnalysis(created);
      void mutate();
      toast.success("Daily analysis created", formatDateLong(new Date(date + "T00:00:00")));
    } catch (e) {
      toast.error(
        "Could not create analysis",
        e instanceof Error ? e.message : undefined
      );
    }
  }, [currentAccountId, supabase, date, mutate, toast]);

  function shiftDay(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toDateKey(d));
  }
  function goToday() {
    setDate(toDateKey(new Date()));
  }

  // ---- Live calculated values ----
  const slPips = React.useMemo(() => {
    if (!analysis) return null;
    const raw = pipsFromPrices(
      analysis.planned_entry,
      analysis.planned_stop_loss,
      analysis.instrument
    );
    return raw !== null ? Number(raw.toFixed(1)) : null;
  }, [analysis]);

  const rr = React.useMemo(() => {
    if (!analysis) return null;
    const raw = computeRR(
      analysis.planned_entry,
      analysis.planned_stop_loss,
      analysis.planned_take_profit
    );
    if (raw === null || !Number.isFinite(raw)) return null;
    // Round to 2 decimals so floating point never makes 2.00 look like 1.9999
    return Number(raw.toFixed(2));
  }, [analysis]);

  const riskAmount = React.useMemo(() => {
    if (!analysis) return 0;
    return computeRiskAmount(
      Number(currentAccount?.starting_capital ?? 0),
      analysis.planned_risk_percent ?? 0
    );
  }, [analysis, currentAccount]);

  const expectedProfit = React.useMemo(
    () => computeExpectedProfit(riskAmount, rr),
    [riskAmount, rr]
  );

  // Persist derived SL pips / RR / expected profit back to the analysis
  // so Trade Check reads the same numbers.
  React.useEffect(() => {
    if (!analysis) return;
    const nextSl = slPips !== null ? Number(slPips.toFixed(1)) : null;
    const nextRr = rr !== null ? Number(rr.toFixed(2)) : null;
    const nextProfit = expectedProfit > 0 ? Number(expectedProfit.toFixed(2)) : null;
    const nextRisk = riskAmount > 0 ? Number(riskAmount.toFixed(2)) : null;

    const changed =
      analysis.planned_sl_pips !== nextSl ||
      analysis.planned_rr !== nextRr ||
      analysis.planned_expected_profit !== nextProfit ||
      analysis.planned_risk_amount !== nextRisk;

    if (changed) {
      update({
        planned_sl_pips: nextSl,
        planned_rr: nextRr,
        planned_expected_profit: nextProfit,
        planned_risk_amount: nextRisk,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slPips, rr, expectedProfit, riskAmount, analysis?.id]);

  const checklist = analysis?.confirmation_checklist ?? DEFAULT_CHECKLIST;
  const confirmScore = React.useMemo(
    () => computeConfirmationScore(checklist),
    [checklist]
  );

  const derivedStatus = analysis ? deriveStatus(analysis) : "ANALYSIS_CREATED";

  // ---- Loading / empty ----
  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Daily Analysis"
          subtitle="Morning preparation, trade plan and post-market review."
        />
        <EmptyState
          title="No account selected"
          description="Create an account in Settings to begin."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Daily Analysis" />
        <BlockLoader label="Loading analysis" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Daily Analysis"
          subtitle="Morning preparation, trade plan and post-market review."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => shiftDay(-1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="px-2 text-xs text-ink-700">
                {formatDateLong(new Date(date + "T00:00:00"))}
              </div>
              <Button variant="outline" size="sm" onClick={() => shiftDay(1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                Today
              </Button>
            </div>
          }
        />
        <AccountHeader
          account={currentAccount}
          currentCapital={metrics.currentCapital}
        />
        <Card>
          <CardBody className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-soft text-brand-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">
                No analysis for {formatDateLong(new Date(date + "T00:00:00"))}
              </div>
              <p className="mt-1 text-2xs text-ink-500">
                Start your morning preparation — bias, levels, liquidity and scenarios.
              </p>
            </div>
            <Button onClick={createBlank}>Create Daily Analysis</Button>
          </CardBody>
        </Card>
        {history.length > 0 && (
          <HistoryCard history={history} onPick={(d) => setDate(d)} />
        )}
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Analysis"
        subtitle="Morning preparation, trade plan and post-market review."
        actions={
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} />
            <Button variant="outline" size="sm" onClick={() => shiftDay(-1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => shiftDay(1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Link href={`/trade-check?analysis=${analysis.id}`}>
              <Button variant="outline" size="sm">Open Trade Check</Button>
            </Link>
            <Link href="/journal">
              <Button size="sm">Journal</Button>
            </Link>
          </div>
        }
      />

      <AccountHeader
        account={currentAccount}
        currentCapital={metrics.currentCapital}
      />

      {/* LINKED TRADE */}
      <LinkedTradeBanner
        accountId={currentAccountId}
        dailyAnalysisId={analysis.id}
        tradePlanId={analysis.active_plan_id ?? null}
      />

      {/* PIPELINE */}
      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap items-center gap-2 text-3xs">
            {(
              [
                "ANALYSIS",
                "CONFIRMATION",
                "TRADE_CHECK",
                "READY",
                "TRADE_TAKEN",
              ] as const
            ).map((step, i) => {
              const stages = [
                "ANALYSIS",
                "CONFIRMATION",
                "TRADE_CHECK",
                "READY",
                "TRADE_TAKEN",
              ];
              const current = computePipelineStage(analysis, false);
              const currentIdx = stages.indexOf(current);
              const stepIdx = i;
              const active = stepIdx <= currentIdx;
              return (
                <span key={step} className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 ${
                      active
                        ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                        : "border-border text-ink-500"
                    }`}
                  >
                    {step.replace(/_/g, " ")}
                  </span>
                  {i < stages.length - 1 && (
                    <span className="text-ink-300">→</span>
                  )}
                </span>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* HEADER SUMMARY */}
      <Card>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <HeaderStat
            label="Analysis date"
            value={formatDateLong(new Date(date + "T00:00:00"))}
          />
          <HeaderStat
            label="Today's status"
            value={STATUS_LABEL[derivedStatus] ?? derivedStatus}
            tone={STATUS_TONE[derivedStatus]}
          />
          <HeaderStat
            label="Today's risk"
            value={`0.25% / ${formatCurrency(
              computeRiskAmount(Number(currentAccount.starting_capital), 0.25)
            )}`}
          />
          <HeaderStat label="Max trades today" value="1" />
        </CardBody>
      </Card>

      {/* READINESS */}
      <ReadinessPanel analysis={analysis} />

      {/* MARKET BIAS */}
      <Card>
        <CardHeader>
          <CardTitle>Market Bias</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Higher Timeframe Bias" htmlFor="htf_bias">
              <Select
                id="htf_bias"
                value={analysis.higher_timeframe_bias ?? ""}
                onChange={(e) =>
                  update({
                    higher_timeframe_bias: (e.target.value || null) as DailyAnalysis["higher_timeframe_bias"],
                  })
                }
                options={["Bullish", "Bearish", "Neutral"]}
                placeholder="Select"
              />
            </Field>
            <Field label="Market Structure" htmlFor="market_structure">
              <Select
                id="market_structure"
                value={analysis.market_structure ?? ""}
                onChange={(e) =>
                  update({
                    market_structure: (e.target.value || null) as DailyAnalysis["market_structure"],
                  })
                }
                options={["Bullish", "Bearish", "Ranging", "Unclear"]}
                placeholder="Select"
              />
            </Field>
            <Field label="Primary Direction" htmlFor="primary_direction">
              <Select
                id="primary_direction"
                value={analysis.primary_direction ?? ""}
                onChange={(e) =>
                  update({
                    primary_direction: (e.target.value || null) as DirectionOption | null,
                  })
                }
                options={["BUY", "SELL", "WAIT"]}
                placeholder="Select"
              />
            </Field>
            <Field label="Confidence" htmlFor="confidence">
              <Select
                id="confidence"
                value={analysis.confidence ?? ""}
                onChange={(e) =>
                  update({
                    confidence: (e.target.value || null) as DailyAnalysis["confidence"],
                  })
                }
                options={["High", "Medium", "Low"]}
                placeholder="Select"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TagPicker
              label="Bias tags"
              options={BIAS_TAGS}
              value={analysis.bias_tags ?? []}
              onChange={(v) => update({ bias_tags: v })}
            />
            <TagPicker
              label="Structure tags"
              options={STRUCTURE_TAGS}
              value={analysis.structure_tags ?? []}
              onChange={(v) => update({ structure_tags: v })}
            />
            <TagPicker
              label="Liquidity tags"
              options={LIQUIDITY_TAGS}
              value={analysis.liquidity_tags ?? []}
              onChange={(v) => update({ liquidity_tags: v })}
            />
            <TagPicker
              label="Setup tags"
              options={SETUP_TAGS}
              value={analysis.setup_tags ?? []}
              onChange={(v) => update({ setup_tags: v })}
              allowCustom
            />
            <TagPicker
              label="Session tags"
              options={SESSION_TAGS}
              value={analysis.session_tags ?? []}
              onChange={(v) => update({ session_tags: v })}
            />
            <TagPicker
              label="News tags"
              options={NEWS_TAGS}
              value={analysis.news_tags ?? []}
              onChange={(v) => update({ news_tags: v })}
            />
          </div>

          <Field label="Analysis Notes" htmlFor="analysis_notes">
            <Textarea
              id="analysis_notes"
              rows={3}
              value={analysis.analysis_notes ?? ""}
              onChange={(e) => update({ analysis_notes: e.target.value })}
              placeholder="EURUSD is bullish on the higher timeframe. Price is approaching a previous liquidity area. I will wait for confirmation before considering a buy."
            />
          </Field>
        </CardBody>
      </Card>

      {/* MULTI TIMEFRAME */}
      <div className="space-y-4">
        <TimeframeCard
          tf="4H"
          label="4-Hour"
          value={analysis.tf_4h ?? DEFAULT_TF}
          onChange={(v) => update({ tf_4h: v })}
          fields={["trend", "structure", "keyLevels", "liquidity", "zone", "notes"]}
        />
        <TimeframeCard
          tf="1H"
          label="1-Hour"
          value={analysis.tf_1h ?? DEFAULT_TF}
          onChange={(v) => update({ tf_1h: v })}
          fields={["trend", "structure", "keyLevels", "liquidity", "notes"]}
        />
        <TimeframeCard
          tf="15M"
          label="15-Minute"
          value={analysis.tf_15m ?? DEFAULT_TF}
          onChange={(v) => update({ tf_15m: v })}
          fields={["structure", "entryArea", "confirmation", "notes"]}
        />
        <TimeframeCard
          tf="5M"
          label="5-Minute"
          value={analysis.tf_5m ?? DEFAULT_TF}
          onChange={(v) => update({ tf_5m: v })}
          fields={["trigger", "slArea", "tpArea", "notes"]}
        />
      </div>

      {/* KEY LEVELS */}
      <KeyLevelsCard
        levels={analysis.key_levels ?? DEFAULT_KEY_LEVELS}
        onChange={(levels) => update({ key_levels: levels })}
      />

      {/* LIQUIDITY */}
      <LiquidityCard
        value={analysis.liquidity ?? DEFAULT_LIQUIDITY}
        onChange={(v) => update({ liquidity: v })}
      />

      {/* TRADE PLAN */}
      <TradePlanCard
        analysis={analysis}
        onUpdate={update}
        slPips={slPips}
        rr={rr}
        riskAmount={riskAmount}
        expectedProfit={expectedProfit}
      />

      {/* CONFIRMATION CHECKLIST */}
      <ChecklistCard
        checklist={checklist}
        onChange={(c) => update({ confirmation_checklist: c })}
        score={confirmScore}
        status={derivedStatus}
        onSetStatus={(s) => update({ status: s })}
      />

      {/* EXPECTATION */}
      <Card>
        <CardHeader>
          <CardTitle>What I Expect Today</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Expected move" htmlFor="expected_move">
            <Textarea
              id="expected_move"
              rows={3}
              value={analysis.expected_move ?? ""}
              onChange={(e) => update({ expected_move: e.target.value })}
              placeholder="What do I expect EURUSD to do?"
            />
          </Field>
          <Field label="What would invalidate my analysis?" htmlFor="invalidation">
            <Textarea
              id="invalidation"
              rows={3}
              value={analysis.invalidation ?? ""}
              onChange={(e) => update({ invalidation: e.target.value })}
              placeholder="If price breaks and closes above this level, my idea is invalid."
            />
          </Field>
        </CardBody>
      </Card>

      {/* SCENARIOS */}
      <ScenariosCard
        scenarios={analysis.scenarios ?? DEFAULT_SCENARIOS}
        onChange={(s) => update({ scenarios: s })}
      />

      {/* NEWS */}
      <NewsCard analysis={analysis} onUpdate={update} />

      {/* OUTCOME */}
      <OutcomeCard
        analysis={analysis}
        onUpdate={update}
        onRecompute={(mistakesCount) =>
          computeAnalysisAccuracy(analysis, mistakesCount)
        }
      />

      {/* END OF DAY */}
      <EndOfDayCard
        value={analysis.end_of_day_review ?? DEFAULT_END_OF_DAY}
        onChange={(v) => update({ end_of_day_review: v })}
        lesson={analysis.lesson ?? ""}
        onLessonChange={(v) => update({ lesson: v })}
      />

      {/* HISTORY */}
      {history.length > 0 && (
        <HistoryCard history={history} onPick={(d) => setDate(d)} />
      )}
    </div>
  );
}

// ---------- Subcomponents ----------

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-soft px-2 py-1 text-3xs text-ink-600">
        <Clock className="h-3 w-3 animate-pulse" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-profit-border bg-profit-bg px-2 py-1 text-3xs text-profit-text">
        <CheckCircle2 className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-loss-border bg-loss-bg px-2 py-1 text-3xs text-loss-text">
        <AlertTriangle className="h-3 w-3" /> Save failed
      </span>
    );
  }
  return null;
}

function HeaderStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "brand" | "profit" | "loss" | "warn";
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-ink-900">
        {tone ? <Badge tone={tone}>{value}</Badge> : value}
      </div>
    </div>
  );
}

interface TFProps {
  tf: string;
  label: string;
  value: TimeframeAnalysis;
  onChange: (v: TimeframeAnalysis) => void;
  fields: (keyof TimeframeAnalysis)[];
}

function TimeframeCard({ tf, label, value, onChange, fields }: TFProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const fieldLabels: Record<string, string> = {
    trend: "Trend",
    structure: "Structure",
    keyLevels: "Key levels",
    liquidity: "Liquidity",
    zone: "Supply / Demand zone",
    entryArea: "Entry area",
    confirmation: "Confirmation I am waiting for",
    trigger: "Trigger",
    slArea: "SL area",
    tpArea: "TP area",
    notes: "Notes",
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label} ({tf})</CardTitle>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-3xs text-ink-500 hover:text-ink-800"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </CardHeader>
      {!collapsed && (
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={String(f)} label={fieldLabels[String(f)] ?? String(f)} htmlFor={`${tf}_${String(f)}`}>
              <Textarea
                id={`${tf}_${String(f)}`}
                rows={2}
                value={(value[f] as string) ?? ""}
                onChange={(e) => onChange({ ...value, [f]: e.target.value })}
              />
            </Field>
          ))}
        </CardBody>
      )}
    </Card>
  );
}

function KeyLevelsCard({
  levels,
  onChange,
}: {
  levels: KeyLevel[];
  onChange: (l: KeyLevel[]) => void;
}) {
  function setAt(idx: number, patch: Partial<KeyLevel>) {
    const next = [...levels];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Levels</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange([
              ...levels,
              { id: `custom_${Date.now()}`, name: "Custom", price: "", type: "Custom", notes: "" },
            ])
          }
        >
          Add level
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Price</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {levels.map((l, i) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    <Input value={l.name} onChange={(e) => setAt(i, { name: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={l.price} onChange={(e) => setAt(i, { price: e.target.value })} placeholder="0.0000" />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={l.type} onChange={(e) => setAt(i, { type: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <Input value={l.notes ?? ""} onChange={(e) => setAt(i, { notes: e.target.value })} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onChange(levels.filter((_, j) => j !== i))}
                      className="text-3xs text-loss-text hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function LiquidityCard({
  value,
  onChange,
}: {
  value: LiquidityPlan;
  onChange: (v: LiquidityPlan) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquidity</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Buy-side liquidity price" htmlFor="liq_buy_p">
            <Input
              id="liq_buy_p"
              value={value.buySidePrice ?? ""}
              onChange={(e) => onChange({ ...value, buySidePrice: e.target.value })}
              placeholder="0.0000"
            />
          </Field>
          <Field label="Buy-side notes" htmlFor="liq_buy_n">
            <Input
              id="liq_buy_n"
              value={value.buySideNotes ?? ""}
              onChange={(e) => onChange({ ...value, buySideNotes: e.target.value })}
            />
          </Field>
          <Field label="Sell-side liquidity price" htmlFor="liq_sell_p">
            <Input
              id="liq_sell_p"
              value={value.sellSidePrice ?? ""}
              onChange={(e) => onChange({ ...value, sellSidePrice: e.target.value })}
              placeholder="0.0000"
            />
          </Field>
          <Field label="Sell-side notes" htmlFor="liq_sell_n">
            <Input
              id="liq_sell_n"
              value={value.sellSideNotes ?? ""}
              onChange={(e) => onChange({ ...value, sellSideNotes: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Expected liquidity event" htmlFor="liq_event">
          <Select
            id="liq_event"
            value={value.expectedEvent ?? ""}
            onChange={(e) =>
              onChange({ ...value, expectedEvent: e.target.value as LiquidityPlan["expectedEvent"] })
            }
            options={["Sweep Buy-side", "Sweep Sell-side", "No clear liquidity", "Wait"]}
            placeholder="Select"
          />
        </Field>
      </CardBody>
    </Card>
  );
}

function TradePlanCard({
  analysis,
  onUpdate,
  slPips,
  rr,
  riskAmount,
  expectedProfit,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
  slPips: number | null;
  rr: number | null;
  riskAmount: number;
  expectedProfit: number;
}) {
  const rrWarning = rr !== null && rr < 1.995;
  const instrument = analysis.instrument || "EURUSD";

  // Helper to derive a price from a pip entry, based on entry price + direction
  function priceFromPips(pips: number, isSL: boolean) {
    const entry = analysis.planned_entry;
    if (entry === null) return null;
    const direction = analysis.planned_direction;
    // SELL: SL is above entry, TP is below entry
    // BUY:  SL is below entry, TP is above entry
    const sign =
      direction === "SELL"
        ? isSL
          ? 1
          : -1
        : isSL
          ? -1
          : 1;
    const pipSize =
      instrument === "USDJPY" || instrument === "GBPJPY"
        ? 0.01
        : instrument === "XAUUSD / Gold"
          ? 0.1
          : instrument === "NAS100" || instrument === "US30" || instrument === "SPX500"
            ? 1
            : 0.0001;
    return Number((entry + sign * pips * pipSize).toFixed(5));
  }

  const [slPipsInput, setSlPipsInput] = React.useState("");
  const [tpPipsInput, setTpPipsInput] = React.useState("");

  // When the user types a pip value, compute the price
  function applySLPips() {
    const pips = Number(slPipsInput);
    if (!Number.isFinite(pips) || pips <= 0) return;
    const price = priceFromPips(pips, true);
    if (price !== null) {
      onUpdate({ planned_stop_loss: price, planned_sl_pips: pips });
    }
    setSlPipsInput("");
  }
  function applyTPPips() {
    const pips = Number(tpPipsInput);
    if (!Number.isFinite(pips) || pips <= 0) return;
    const price = priceFromPips(pips, false);
    if (price !== null) {
      onUpdate({ planned_take_profit: price, planned_risk_percent: analysis.planned_risk_percent ?? 0.25 });
    }
    setTpPipsInput("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Trade Plan</CardTitle>
        {rrWarning && <Badge tone="warn">RR below plan</Badge>}
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Direction" htmlFor="planned_direction">
            <Select
              id="planned_direction"
              value={analysis.planned_direction ?? ""}
              onChange={(e) =>
                onUpdate({ planned_direction: (e.target.value || null) as DirectionOption | null })
              }
              options={["BUY", "SELL"]}
              placeholder="Select"
            />
          </Field>
          <Field label="Entry price" htmlFor="planned_entry" hint="e.g. 1.1720">
            <Input
              id="planned_entry"
              type="number"
              step="any"
              value={analysis.planned_entry ?? ""}
              onChange={(e) => onUpdate({ planned_entry: parseNumberOrNull(e.target.value) })}
              placeholder="1.0000"
            />
          </Field>
          <Field label="Risk %" htmlFor="planned_risk">
            <Input
              id="planned_risk"
              type="number"
              step="0.01"
              value={analysis.planned_risk_percent ?? ""}
              onChange={(e) =>
                onUpdate({ planned_risk_percent: parseNumberOrNull(e.target.value) })
              }
              suffix="%"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Stop loss (price)" htmlFor="planned_sl" hint="Full price, e.g. 1.1708">
            <Input
              id="planned_sl"
              type="number"
              step="any"
              value={analysis.planned_stop_loss ?? ""}
              onChange={(e) => onUpdate({ planned_stop_loss: parseNumberOrNull(e.target.value) })}
              placeholder="1.0000"
            />
          </Field>
          <Field label="Or enter SL in pips" htmlFor="planned_sl_pips_input" hint="e.g. 12">
            <div className="flex items-center gap-2">
              <Input
                id="planned_sl_pips_input"
                type="number"
                step="1"
                value={slPipsInput}
                onChange={(e) => setSlPipsInput(e.target.value)}
                placeholder="12"
              />
              <Button variant="outline" size="sm" type="button" onClick={applySLPips}>
                Apply
              </Button>
            </div>
          </Field>

          <Field label="Take profit (price)" htmlFor="planned_tp" hint="Full price, e.g. 1.1744">
            <Input
              id="planned_tp"
              type="number"
              step="any"
              value={analysis.planned_take_profit ?? ""}
              onChange={(e) => onUpdate({ planned_take_profit: parseNumberOrNull(e.target.value) })}
              placeholder="1.0000"
            />
          </Field>
          <Field label="Or enter TP in pips" htmlFor="planned_tp_pips_input" hint="e.g. 24">
            <div className="flex items-center gap-2">
              <Input
                id="planned_tp_pips_input"
                type="number"
                step="1"
                value={tpPipsInput}
                onChange={(e) => setTpPipsInput(e.target.value)}
                placeholder="24"
              />
              <Button variant="outline" size="sm" type="button" onClick={applyTPPips}>
                Apply
              </Button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded border border-border bg-surface-soft p-3 sm:grid-cols-4">
          <CalcStat label="SL distance" value={slPips !== null ? `${slPips.toFixed(1)} pips` : "—"} />
          <CalcStat
            label="Risk"
            value={`${analysis.planned_risk_percent?.toFixed(2) ?? "—"}% = ${formatCurrency(riskAmount)}`}
          />
          <CalcStat
            label="RR"
            value={rr !== null ? `1:${rr.toFixed(2)}` : "—"}
            valueClass={rrWarning ? "text-warn-text" : undefined}
          />
          <CalcStat
            label="Expected profit"
            value={rr !== null ? formatCurrency(expectedProfit) : "—"}
            valueClass="text-profit-text"
          />
        </div>

        {rrWarning && (
          <div className="rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
            ⚠️ RR below plan — minimum required is 1:2.
          </div>
        )}

        {(analysis.planned_sl_pips === null || analysis.planned_rr === null) &&
          analysis.planned_entry !== null &&
          analysis.planned_stop_loss !== null && (
            <div className="rounded border border-border bg-surface-soft px-3 py-2 text-3xs text-ink-500">
              Tip: enter the full price in SL/TP fields (e.g. 1.1708), or use the pip inputs above. Pips like <code>10</code> are not valid prices.
            </div>
          )}
      </CardBody>
    </Card>
  );
}
function CalcStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn("tabular mt-0.5 text-xs font-semibold text-ink-900", valueClass)}>
        {value}
      </div>
    </div>
  );
}

function ChecklistCard({
  checklist,
  onChange,
  score,
  status,
  onSetStatus,
}: {
  checklist: ChecklistItem[];
  onChange: (c: ChecklistItem[]) => void;
  score: { checked: number; total: number; percent: number; allChecked: boolean };
  status: string;
  onSetStatus: (s: DailyAnalysis["status"]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmation Checklist</CardTitle>
        <Badge tone={score.allChecked ? "profit" : "neutral"}>
          {score.checked}/{score.total}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklist.map((c, i) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center gap-2 rounded border border-border bg-surface-soft px-3 py-2 text-2xs hover:bg-white"
            >
              <input
                type="checkbox"
                checked={c.checked}
                onChange={(e) => {
                  const next = [...checklist];
                  next[i] = { ...c, checked: e.target.checked };
                  onChange(next);
                }}
                className="h-3.5 w-3.5"
              />
              <span className="text-ink-800">{c.label}</span>
            </label>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between text-2xs">
            <span className="text-ink-700">Confirmation score</span>
            <span className="tabular font-semibold text-ink-900">
              {score.checked}/{score.total}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full", score.allChecked ? "bg-profit" : "bg-brand-600")}
              style={{ width: `${score.percent}%` }}
            />
          </div>
        </div>

        {score.allChecked && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-semibold">SETUP CONDITIONS SATISFIED</span>
            <span className="text-3xs opacity-80">
              (The final decision remains yours.)
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3 text-3xs">
          <span className="text-ink-500">Set status:</span>
          {(
            [
              ["ANALYSIS_CREATED", "Analysis Created"],
              ["WAITING_FOR_CONFIRMATION", "Waiting"],
              ["SETUP_CONFIRMED", "Confirmed"],
              ["INVALIDATED", "Invalidated"],
              ["NO_TRADE", "No Trade"],
              ["TRADE_TAKEN", "Trade Taken"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => onSetStatus(k)}
              className={cn(
                "rounded border px-2 py-0.5 text-3xs transition-colors",
                status === k
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-border text-ink-600 hover:bg-surface-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function ScenariosCard({
  scenarios,
  onChange,
}: {
  scenarios: Scenario[];
  onChange: (s: Scenario[]) => void;
}) {
  function setAt(idx: number, patch: Partial<Scenario>) {
    const next = [...scenarios];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>IF / THEN Plan</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange([
              ...scenarios,
              { id: `S${scenarios.length + 1}`, label: `Scenario ${scenarios.length + 1}`, ifText: "", thenText: "" },
            ])
          }
        >
          Add scenario
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        {scenarios.map((s, i) => (
          <div key={s.id} className="rounded border border-border bg-surface-soft p-3">
            <div className="flex items-center justify-between">
              <Input
                value={s.label}
                onChange={(e) => setAt(i, { label: e.target.value })}
                className="max-w-xs"
              />
              <button
                type="button"
                onClick={() => onChange(scenarios.filter((_, j) => j !== i))}
                className="text-3xs text-loss-text hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="IF" htmlFor={`${s.id}_if`}>
                <Textarea id={`${s.id}_if`} rows={2} value={s.ifText} onChange={(e) => setAt(i, { ifText: e.target.value })} />
              </Field>
              <Field label="THEN" htmlFor={`${s.id}_then`}>
                <Textarea id={`${s.id}_then`} rows={2} value={s.thenText} onChange={(e) => setAt(i, { thenText: e.target.value })} />
              </Field>
              <Field label="SL" htmlFor={`${s.id}_sl`}>
                <Input id={`${s.id}_sl`} value={s.slText ?? ""} onChange={(e) => setAt(i, { slText: e.target.value })} />
              </Field>
              <Field label="TP" htmlFor={`${s.id}_tp`}>
                <Input id={`${s.id}_tp`} value={s.tpText ?? ""} onChange={(e) => setAt(i, { tpText: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function NewsCard({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>News Check</CardTitle>
        {analysis.news_major && <Badge tone="warn">NEWS RISK DETECTED</Badge>}
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Major news today?" htmlFor="news_major">
          <Select
            id="news_major"
            value={analysis.news_major ? "YES" : "NO"}
            onChange={(e) => onUpdate({ news_major: e.target.value === "YES" })}
            options={["NO", "YES"]}
          />
        </Field>
        <Field label="News time" htmlFor="news_time">
          <Input
            id="news_time"
            type="time"
            value={analysis.news_time ?? ""}
            onChange={(e) => onUpdate({ news_time: e.target.value || null })}
          />
        </Field>
        <Field label="Currency affected" htmlFor="news_currency">
          <Input
            id="news_currency"
            value={analysis.news_currency ?? ""}
            onChange={(e) => onUpdate({ news_currency: e.target.value || null })}
            placeholder="USD"
          />
        </Field>
        <Field label="Notes" htmlFor="news_notes">
          <Input
            id="news_notes"
            value={analysis.news_notes ?? ""}
            onChange={(e) => onUpdate({ news_notes: e.target.value || null })}
          />
        </Field>
      </CardBody>
    </Card>
  );
}

function OutcomeCard({
  analysis,
  onUpdate,
  onRecompute,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
  onRecompute: (mistakesCount: number) => number | null;
}) {
  const [mistakes, setMistakes] = React.useState<string[]>(analysis.mistakes ?? []);
  const accuracy = React.useMemo(
    () => onRecompute(mistakes.length),
    [mistakes.length, onRecompute]
  );

  React.useEffect(() => {
    setMistakes(analysis.mistakes ?? []);
  }, [analysis.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>What Actually Happened?</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Actual high" htmlFor="actual_high">
            <Input id="actual_high" type="number" step="any" value={analysis.actual_high ?? ""} onChange={(e) => onUpdate({ actual_high: parseNumberOrNull(e.target.value) })} />
          </Field>
          <Field label="Actual low" htmlFor="actual_low">
            <Input id="actual_low" type="number" step="any" value={analysis.actual_low ?? ""} onChange={(e) => onUpdate({ actual_low: parseNumberOrNull(e.target.value) })} />
          </Field>
          <Field label="Actual direction" htmlFor="actual_direction">
            <Select id="actual_direction" value={analysis.actual_direction ?? ""} onChange={(e) => onUpdate({ actual_direction: e.target.value || null })} options={["BUY", "SELL", "Ranging"]} placeholder="—" />
          </Field>
          <Field label="Actual entry" htmlFor="actual_entry">
            <Input id="actual_entry" type="number" step="any" value={analysis.actual_entry ?? ""} onChange={(e) => onUpdate({ actual_entry: parseNumberOrNull(e.target.value) })} />
          </Field>
        </div>

        <Field label="Actual movement / what happened" htmlFor="actual_movement">
          <Textarea id="actual_movement" rows={3} value={analysis.actual_movement ?? ""} onChange={(e) => onUpdate({ actual_movement: e.target.value })} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Did price follow my analysis?" htmlFor="followed_analysis">
            <Select id="followed_analysis" value={analysis.followed_analysis ?? ""} onChange={(e) => onUpdate({ followed_analysis: e.target.value || null })} options={["YES", "PARTIALLY", "NO"]} placeholder="—" />
          </Field>
          <Field label="Analysis result" htmlFor="analysis_result">
            <Select id="analysis_result" value={analysis.analysis_result ?? ""} onChange={(e) => onUpdate({ analysis_result: e.target.value || null })} options={["Correct", "Partially Correct", "Incorrect", "No Setup"]} placeholder="—" />
          </Field>
        </div>

        <Field label="Analysis review notes" htmlFor="analysis_review_notes">
          <Textarea id="analysis_review_notes" rows={3} value={analysis.analysis_review_notes ?? ""} onChange={(e) => onUpdate({ analysis_review_notes: e.target.value })} placeholder="My bias was correct, but I did not receive my entry confirmation, so I correctly stayed out." />
        </Field>

        <div>
          <div className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-600">
            Mistakes
          </div>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_OPTIONS.map((m) => {
              const checked = mistakes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? mistakes.filter((x) => x !== m)
                      : [...mistakes, m];
                    setMistakes(next);
                    onUpdate({ mistakes: next });
                  }}
                  className={cn(
                    "rounded border px-2 py-1 text-3xs transition-colors",
                    checked
                      ? "border-warn-border bg-warn-bg text-warn-text"
                      : "border-border text-ink-600 hover:bg-surface-muted"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded border border-border bg-surface-soft px-3 py-2 text-2xs">
          <span className="text-ink-600">Analysis accuracy: </span>
          <span className="tabular font-semibold text-ink-900">
            {accuracy !== null ? formatPercent(accuracy, 0) : "—"}
          </span>
          <p className="mt-1 text-3xs text-ink-500">
            This is based on whether your thesis and conditions were accurate —
            not on P/L.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function EndOfDayCard({
  value,
  onChange,
  lesson,
  onLessonChange,
}: {
  value: EndOfDayReview;
  onChange: (v: EndOfDayReview) => void;
  lesson: string;
  onLessonChange: (v: string) => void;
}) {
  const questions: { key: keyof EndOfDayReview; label: string }[] = [
    { key: "followedPlan", label: "Did I follow my plan?" },
    { key: "marketAsExpected", label: "Did the market behave as expected?" },
    { key: "tookTrade", label: "Did I take a trade?" },
    { key: "tradeConfirmed", label: "Was the trade confirmed?" },
    { key: "riskRespected", label: "Did I respect my risk?" },
    { key: "slRespected", label: "Did I respect my SL?" },
    { key: "tpRespected", label: "Did I respect my TP?" },
    { key: "rrFollowed", label: "Did I follow 1:2 RR?" },
    { key: "madeMistakes", label: "Did I make any mistakes?" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>End-of-Day Review</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {questions.map((q) => (
            <Field key={q.key} label={q.label} htmlFor={String(q.key)}>
              <Select
                id={String(q.key)}
                value={(value[q.key] as string) ?? ""}
                onChange={(e) => onChange({ ...value, [q.key]: e.target.value })}
                options={["YES", "NO", "PARTIALLY", "N/A"]}
                placeholder="—"
              />
            </Field>
          ))}
        </div>
        <Field label="What did I learn today?" htmlFor="whatLearned">
          <Textarea
            id="whatLearned"
            rows={2}
            value={value.whatLearned ?? ""}
            onChange={(e) => onChange({ ...value, whatLearned: e.target.value })}
          />
        </Field>
        <Field label="Today's lesson" htmlFor="lesson">
          <Textarea
            id="lesson"
            rows={3}
            value={lesson}
            onChange={(e) => onLessonChange(e.target.value)}
          />
        </Field>
      </CardBody>
    </Card>
  );
}

function HistoryCard({
  history,
  onPick,
}: {
  history: DailyAnalysis[];
  onPick: (date: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-brand-600" />
          <CardTitle>Previous Analyses</CardTitle>
        </div>
        <Badge tone="neutral">{history.length}</Badge>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-border">
          {history.slice(0, 30).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.analysis_date)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink-900">
                  {formatDateLong(new Date(a.analysis_date + "T00:00:00"))}
                </div>
                <div className="mt-0.5 text-3xs text-ink-500">
                  {a.planned_direction ?? "—"} · {a.higher_timeframe_bias ?? "—"}
                </div>
              </div>
              <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                {STATUS_LABEL[a.status]?.replace(/^\S+\s/, "") ?? a.status}
              </Badge>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}











