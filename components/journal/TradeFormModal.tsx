"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { TagPicker } from "@/components/ui/TagPicker";
import {
  ScreenshotUploader,
  type UploadedScreenshot,
} from "@/components/ui/ScreenshotUploader";
import { useToast } from "@/components/ui/Toast";
import { createTrade, updateTrade } from "@/lib/data/trades";
import {
  addTradeScreenshot,
  listTradeScreenshots,
  removeTradeScreenshot,
} from "@/lib/data/trade-screenshots";
import {
  getSignedUrl,
  uploadScreenshot,
  deleteScreenshot,
} from "@/lib/data/screenshots";
import { useDailyAnalysesHistory } from "@/lib/data/daily-analysis-hooks";
import { getTradePlanByAnalysis } from "@/lib/data/trade-plans";
import { createSnapshot, buildSnapshotPayload } from "@/lib/data/analysis-snapshots";
import { computeAndPersistRules } from "@/lib/data/rule-checks";
import {
  INSTRUMENTS,
  DIRECTIONS,
  RESULTS,
  RISK_REWARD_OPTIONS,
  STRATEGIES,
  SETUP_TYPES,
  TIMEFRAMES,
  SESSIONS,
  MARKET_BIAS_OPTIONS,
  ENTRY_MODELS,
  LIQUIDITY_TAKEN_OPTIONS,
  NEWS_EVENTS,
} from "@/lib/constants";
import {
  ENTRY_REASON_TAGS,
  EXIT_REASON_TAGS,
  MANAGEMENT_TAGS,
  WELL_TAGS,
  MISTAKE_TAGS,
  EMOTION_TAGS,
  MARKET_TAGS,
  LESSON_TAGS,
} from "@/lib/tags";
import type { Account, Trade, DailyAnalysis } from "@/lib/types";
import {
  emptyToNull,
  formatDateMedium,
  parseNumberOrNull,
  toDateKey,
} from "@/lib/utils";

export interface TradeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: Account;
  weeklyTradeCount: number;
  editing?: Trade | null;
  prefillAnalysis?: DailyAnalysis | null;
}

type FormState = {
  trade_date: string;
  trade_time: string;
  instrument: string;
  direction: string;
  result: string;
  lot_size: string;
  entry_price: string;
  exit_price: string;
  stop_loss: string;
  take_profit: string;
  risk_amount: string;
  profit_loss: string;
  risk_reward: string;
  pips: string;
  commission: string;
  swap: string;
  spread: string;
  holding_time: string;
  strategy: string;
  setup_type: string;
  timeframe: string;
  session: string;
  market_bias: string;
  entry_model: string;
  liquidity_taken: string;
  news_event: string;
  entry_reason: string;
  exit_reason: string;
  management: string;
  mistakes: string;
  emotions: string;
  notes: string;
  what_went_well: string;
  market_observation: string;
  lesson: string;
};

function initialState(t?: Trade | null): FormState {
  return {
    trade_date: t?.trade_date ?? toDateKey(new Date()),
    trade_time: t?.trade_time?.slice(0, 5) ?? "",
    instrument: t?.instrument ?? "",
    direction: t?.direction ?? "",
    result: t?.result ?? "",
    lot_size: t?.lot_size != null ? String(t.lot_size) : "",
    entry_price: t?.entry_price != null ? String(t.entry_price) : "",
    exit_price: t?.exit_price != null ? String(t.exit_price) : "",
    stop_loss: t?.stop_loss != null ? String(t.stop_loss) : "",
    take_profit: t?.take_profit != null ? String(t.take_profit) : "",
    risk_amount: t?.risk_amount != null ? String(t.risk_amount) : "",
    profit_loss: t?.profit_loss != null ? String(t.profit_loss) : "",
    risk_reward: t?.risk_reward ?? "",
    pips: t?.pips != null ? String(t.pips) : "",
    commission: t?.commission != null ? String(t.commission) : "",
    swap: t?.swap != null ? String(t.swap) : "",
    spread: t?.spread != null ? String(t.spread) : "",
    holding_time: t?.holding_time ?? "",
    strategy: t?.strategy ?? "",
    setup_type: t?.setup_type ?? "",
    timeframe: t?.timeframe ?? "",
    session: t?.session ?? "",
    market_bias: t?.market_bias ?? "",
    entry_model: t?.entry_model ?? "",
    liquidity_taken: t?.liquidity_taken ?? "",
    news_event: t?.news_event ?? "",
    entry_reason: t?.entry_reason ?? "",
    exit_reason: t?.exit_reason ?? "",
    management: t?.management ?? "",
    mistakes: t?.mistakes ?? "",
    emotions: t?.emotions ?? "",
    notes: t?.notes ?? "",
    what_went_well: t?.what_went_well ?? "",
    market_observation: t?.market_observation ?? "",
    lesson: t?.lesson ?? "",
  };
}

function prefillFromAnalysis(form: FormState, analysis: DailyAnalysis): FormState {
  const next = { ...form };
  if (!next.instrument && analysis.instrument) next.instrument = analysis.instrument;
  if (!next.direction && analysis.planned_direction) {
    next.direction =
      analysis.planned_direction === "BUY"
        ? "Buy"
        : analysis.planned_direction === "SELL"
          ? "Sell"
          : "";
  }
  if (!next.entry_price && analysis.planned_entry !== null) {
    next.entry_price = String(analysis.planned_entry);
  }
  if (!next.stop_loss && analysis.planned_stop_loss !== null) {
    next.stop_loss = String(analysis.planned_stop_loss);
  }
  if (!next.take_profit && analysis.planned_take_profit !== null) {
    next.take_profit = String(analysis.planned_take_profit);
  }
  if (!next.risk_amount && analysis.planned_risk_amount !== null) {
    next.risk_amount = String(analysis.planned_risk_amount);
  }
  if (!next.risk_reward && analysis.planned_rr !== null) {
    next.risk_reward = `1 : ${analysis.planned_rr.toFixed(0)}`;
  }
  if (!next.strategy && analysis.setup_tags && analysis.setup_tags.length > 0) {
    next.strategy = analysis.setup_tags[0];
  }
  if (!next.market_bias && analysis.higher_timeframe_bias) {
    next.market_bias = analysis.higher_timeframe_bias;
  }
  if (!next.timeframe && analysis.tf_15m) {
    next.timeframe = "15 Minutes";
  }
  if (!next.session && analysis.session_tags && analysis.session_tags.length > 0) {
    const s = analysis.session_tags[0];
    if (s === "London/NY overlap") next.session = "London";
    else if (["Asian", "London", "New York"].includes(s)) next.session = s;
  }
  if (!next.news_event && analysis.news_major) {
    next.news_event = "High Impact News";
  } else if (!next.news_event && !analysis.news_major) {
    next.news_event = "No Major News";
  }
  return next;
}

export function TradeFormModal({
  open,
  onClose,
  onSaved,
  account,
  weeklyTradeCount,
  editing,
  prefillAnalysis,
}: TradeFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const isEdit = !!editing;

  const [form, setForm] = React.useState<FormState>(() => initialState(editing));
  const [screenshots, setScreenshots] = React.useState<UploadedScreenshot[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const originallyLoadedIds = React.useRef<Set<string>>(new Set());
  const [analysisId, setAnalysisId] = React.useState<string | null>(
    editing?.daily_analysis_id ?? prefillAnalysis?.id ?? null
  );

  const [entryTags, setEntryTags] = React.useState<string[]>(editing?.entry_tags ?? []);
  const [exitTags, setExitTags] = React.useState<string[]>(editing?.exit_tags ?? []);
  const [mgmtTags, setMgmtTags] = React.useState<string[]>(editing?.management_tags ?? []);
  const [wellTags, setWellTags] = React.useState<string[]>(editing?.well_tags ?? []);
  const [mistakeTags, setMistakeTags] = React.useState<string[]>(editing?.mistake_tags ?? []);
  const [emoBefore, setEmoBefore] = React.useState<string[]>(editing?.emotion_before_tags ?? []);
  const [emoAfter, setEmoAfter] = React.useState<string[]>(editing?.emotion_after_tags ?? []);
  const [marketTags, setMarketTags] = React.useState<string[]>(editing?.market_tags ?? []);
  const [lessonTags, setLessonTags] = React.useState<string[]>(editing?.lesson_tags ?? []);

  const { data: analyses = [] } = useDailyAnalysesHistory(account.id, 30);

  React.useEffect(() => {
    if (!open) return;
    let nextForm = initialState(editing);
    if (!editing && prefillAnalysis) {
      nextForm = prefillFromAnalysis(nextForm, prefillAnalysis);
    }
    setForm(nextForm);
    setErrors({});
    setScreenshots([]);
    setUploadStatus(null);
    setAnalysisId(editing?.daily_analysis_id ?? prefillAnalysis?.id ?? null);
    setEntryTags(editing?.entry_tags ?? []);
    setExitTags(editing?.exit_tags ?? []);
    setMgmtTags(editing?.management_tags ?? []);
    setWellTags(editing?.well_tags ?? []);
    setMistakeTags(editing?.mistake_tags ?? []);
    setEmoBefore(editing?.emotion_before_tags ?? []);
    setEmoAfter(editing?.emotion_after_tags ?? []);
    setMarketTags(editing?.market_tags ?? []);
    setLessonTags(editing?.lesson_tags ?? []);

    if (editing) {
      (async () => {
        try {
          const rows = await listTradeScreenshots(supabase, editing.id);
          const withUrls = await Promise.all(
            rows.map(async (r) => {
              const url = await getSignedUrl(supabase, r.storage_path);
              return {
                id: r.id,
                storagePath: r.storage_path,
                url: url ?? "",
                revocable: false,
              } as UploadedScreenshot;
            })
          );
          const loaded = withUrls.filter((s) => !!s.url);
          setScreenshots(loaded);
          originallyLoadedIds.current = new Set(
            loaded.filter((s) => s.id).map((s) => s.id as string)
          );
        } catch {
          // best effort
        }
      })();
    }
  }, [open, editing, prefillAnalysis, supabase]);

  const weeklyLimitReached =
    !isEdit && weeklyTradeCount >= account.max_weekly_trades;

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.trade_date) next.trade_date = "Date is required.";
    if (!form.instrument) next.instrument = "Instrument is required.";
    if (!form.direction) next.direction = "Direction is required.";
    if (!form.result) next.result = "Result is required.";
    const pl = parseNumberOrNull(form.profit_loss);
    if (pl === null) next.profit_loss = "Profit / Loss is required.";
    if (
      form.lot_size &&
      (Number(form.lot_size) < 0 || !Number.isFinite(Number(form.lot_size)))
    ) {
      next.lot_size = "Lot size cannot be negative.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (weeklyLimitReached) {
      toast.error(
        "Weekly trade limit reached",
        `This account allows ${account.max_weekly_trades} trades per week.`
      );
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }

      let linkedPlanId: string | null = null;
      if (analysisId) {
        try {
          const plan = await getTradePlanByAnalysis(supabase, analysisId);
          linkedPlanId = plan?.id ?? null;
        } catch {
          linkedPlanId = null;
        }
      }

      const payload = {
        account_id: account.id,
        trade_date: form.trade_date,
        trade_time: form.trade_time ? `${form.trade_time}:00` : null,
        instrument: form.instrument,
        direction: form.direction as "Buy" | "Sell",
        result: form.result as "Win" | "Loss" | "Breakeven",
        lot_size: parseNumberOrNull(form.lot_size),
        entry_price: parseNumberOrNull(form.entry_price),
        exit_price: parseNumberOrNull(form.exit_price),
        stop_loss: parseNumberOrNull(form.stop_loss),
        take_profit: parseNumberOrNull(form.take_profit),
        risk_amount: parseNumberOrNull(form.risk_amount),
        profit_loss: parseNumberOrNull(form.profit_loss) ?? 0,
        risk_reward: emptyToNull(form.risk_reward),
        pips: parseNumberOrNull(form.pips),
        commission: parseNumberOrNull(form.commission),
        swap: parseNumberOrNull(form.swap),
        spread: parseNumberOrNull(form.spread),
        holding_time: emptyToNull(form.holding_time),
        strategy: emptyToNull(form.strategy),
        setup_type: emptyToNull(form.setup_type),
        timeframe: emptyToNull(form.timeframe),
        session: emptyToNull(form.session),
        market_bias: emptyToNull(form.market_bias),
        entry_model: emptyToNull(form.entry_model),
        liquidity_taken: emptyToNull(form.liquidity_taken),
        news_event: emptyToNull(form.news_event),
        entry_reason: emptyToNull(form.entry_reason),
        exit_reason: emptyToNull(form.exit_reason),
        management: emptyToNull(form.management),
        mistakes: emptyToNull(form.mistakes),
        emotions: emptyToNull(form.emotions),
        notes: emptyToNull(form.notes),
        what_went_well: emptyToNull(form.what_went_well),
        market_observation: emptyToNull(form.market_observation),
        lesson: emptyToNull(form.lesson),
        mistake_tags: mistakeTags.length > 0 ? mistakeTags : null,
        entry_tags: entryTags.length > 0 ? entryTags : null,
        exit_tags: exitTags.length > 0 ? exitTags : null,
        management_tags: mgmtTags.length > 0 ? mgmtTags : null,
        well_tags: wellTags.length > 0 ? wellTags : null,
        emotion_before_tags: emoBefore.length > 0 ? emoBefore : null,
        emotion_after_tags: emoAfter.length > 0 ? emoAfter : null,
        market_tags: marketTags.length > 0 ? marketTags : null,
        lesson_tags: lessonTags.length > 0 ? lessonTags : null,
        daily_analysis_id: analysisId,
        trade_plan_id: linkedPlanId,
      };

      let savedTrade: Trade;
      if (isEdit && editing) {
        savedTrade = await updateTrade(supabase, editing.id, payload);
      } else {
        savedTrade = await createTrade(supabase, user.id, payload);
      }

      if (!isEdit && analysisId) {
        try {
          const linkedAnalysis = analyses.find((a) => a.id === analysisId);
          if (linkedAnalysis) {
            const plan = linkedPlanId
              ? await getTradePlanByAnalysis(supabase, analysisId)
              : null;
            const snapshotPayload = buildSnapshotPayload(linkedAnalysis, plan);
            await createSnapshot(
              supabase,
              user.id,
              savedTrade.id,
              analysisId,
              linkedPlanId,
              snapshotPayload
            );
          }
        } catch (snapErr) {
          console.warn("[ALLTRADES] snapshot creation failed", snapErr);
        }
      }

      try {
        const { listTrades } = await import("@/lib/data/trades");
        const all = await listTrades(supabase, { accountId: account.id });
        await computeAndPersistRules(supabase, savedTrade, account, all);
      } catch (ruleErr) {
        console.warn("[ALLTRADES] rule compliance compute failed", ruleErr);
      }

      // ---------- SCREENSHOTS ----------
      const pending = screenshots.filter((s) => s.file && !s.storagePath);
      console.log("[ALLTRADES] trade save complete", {
        tradeId: savedTrade.id,
        userId: user.id,
        pendingCount: pending.length,
      });

      if (pending.length > 0) {
        setUploadStatus(
          `Uploading ${pending.length} image${pending.length > 1 ? "s" : ""}…`
        );

        let uploadedCount = 0;
        let failedCount = 0;
        let lastError: string | null = null;

        for (let i = 0; i < pending.length; i++) {
          const s = pending[i];
          try {
            console.log("[ALLTRADES] uploading file", {
              index: i + 1,
              name: s.file?.name,
              size: s.file?.size,
              type: s.file?.type,
            });

            const { path } = await uploadScreenshot(
              supabase,
              user.id,
              `trades/${savedTrade.id}`,
              s.file as File
            );
            console.log("[ALLTRADES] storage upload OK", { path });

            await addTradeScreenshot(
              supabase,
              user.id,
              savedTrade.id,
              path,
              "Analysis"
            );
            uploadedCount++;
          } catch (uploadErr) {
            failedCount++;
            lastError =
              uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
            console.error("[ALLTRADES] trade screenshot upload failed", uploadErr);
          }
        }

        console.log("[ALLTRADES] screenshot summary", {
          uploadedCount,
          failedCount,
          lastError,
        });

        if (uploadedCount > 0) {
          toast.success(
            `${uploadedCount} screenshot${uploadedCount > 1 ? "s" : ""} saved to this trade`
          );
        }
        if (failedCount > 0) {
          toast.error(
            `${failedCount} screenshot${failedCount > 1 ? "s" : ""} could not be saved`,
            lastError ?? "See browser console for the exact error"
          );
        }
      }

      // Only remove screenshots the user explicitly took out of the form.
      if (isEdit && editing && originallyLoadedIds.current.size > 0) {
        const currentIds = new Set(
          screenshots.filter((s) => s.id).map((s) => s.id as string)
        );
        const toRemove = Array.from(originallyLoadedIds.current).filter(
          (id) => !currentIds.has(id)
        );
        if (toRemove.length > 0) {
          const pathByIid = new Map<string, string>();
          screenshots.forEach((s) => {
            if (s.id && s.storagePath) pathByIid.set(s.id, s.storagePath);
          });
          await Promise.all(
            toRemove.map(async (id) => {
              const path = pathByIid.get(id);
              if (path) {
                await deleteScreenshot(supabase, path).catch(() => {});
              }
              await removeTradeScreenshot(supabase, id).catch(() => {});
            })
          );
        }
      }

      toast.success(
        isEdit ? "Trade updated" : "Trade recorded",
        isEdit ? undefined : `${savedTrade.instrument} · ${savedTrade.result}`
      );
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save trade.";
      toast.error("Could not save trade", message);
    } finally {
      setSaving(false);
      setUploadStatus(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Trade" : "New Trade"}
      description={
        prefillAnalysis && !isEdit
          ? `Prefilled from Daily Analysis on ${formatDateMedium(new Date(prefillAnalysis.analysis_date + "T00:00:00"))}`
          : "Record the complete setup, execution and psychology."
      }
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Save trade"}
          </Button>
        </>
      }
    >
      {weeklyLimitReached && (
        <div className="mb-4 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
          Weekly trade limit reached. This account allows{" "}
          {account.max_weekly_trades} trades per week.
        </div>
      )}

      {uploadStatus && (
        <div className="mb-4 rounded border border-brand-200 bg-brand-50 px-3 py-2 text-2xs text-brand-700">
          {uploadStatus}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <Section title="Trade Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date" htmlFor="trade_date" required error={errors.trade_date}>
              <Input id="trade_date" type="date" value={form.trade_date}
                onChange={(e) => set("trade_date", e.target.value)}
                invalid={!!errors.trade_date} />
            </Field>
            <Field label="Time" htmlFor="trade_time">
              <Input id="trade_time" type="time" value={form.trade_time}
                onChange={(e) => set("trade_time", e.target.value)} />
            </Field>
            <Field label="Instrument" htmlFor="instrument" required error={errors.instrument}>
              <Select id="instrument" value={form.instrument}
                onChange={(e) => set("instrument", e.target.value)}
                options={INSTRUMENTS as unknown as string[]}
                placeholder="Select instrument" invalid={!!errors.instrument} />
            </Field>
            <Field label="Direction" htmlFor="direction" required error={errors.direction}>
              <Select id="direction" value={form.direction}
                onChange={(e) => set("direction", e.target.value)}
                options={DIRECTIONS as unknown as string[]}
                placeholder="Select direction" invalid={!!errors.direction} />
            </Field>
            <Field label="Lot Size" htmlFor="lot_size" error={errors.lot_size}>
              <Input id="lot_size" type="number" step="0.0001" min="0"
                value={form.lot_size} onChange={(e) => set("lot_size", e.target.value)}
                placeholder="0.10" />
            </Field>
            <Field label="Entry Price" htmlFor="entry_price">
              <Input id="entry_price" type="number" step="any"
                value={form.entry_price} onChange={(e) => set("entry_price", e.target.value)}
                placeholder="1.0900" />
            </Field>
            <Field label="Exit Price" htmlFor="exit_price">
              <Input id="exit_price" type="number" step="any"
                value={form.exit_price} onChange={(e) => set("exit_price", e.target.value)}
                placeholder="1.0930" />
            </Field>
            <Field label="Stop Loss" htmlFor="stop_loss">
              <Input id="stop_loss" type="number" step="any"
                value={form.stop_loss} onChange={(e) => set("stop_loss", e.target.value)} />
            </Field>
            <Field label="Take Profit" htmlFor="take_profit">
              <Input id="take_profit" type="number" step="any"
                value={form.take_profit} onChange={(e) => set("take_profit", e.target.value)} />
            </Field>
            <Field label="Risk Amount" htmlFor="risk_amount">
              <Input id="risk_amount" type="number" step="0.01"
                value={form.risk_amount} onChange={(e) => set("risk_amount", e.target.value)}
                prefix="$" />
            </Field>
            <Field label="Profit / Loss" htmlFor="profit_loss" required
              error={errors.profit_loss}
              hint="Negative for losses. E.g. -85.00">
              <Input id="profit_loss" type="number" step="0.01"
                value={form.profit_loss} onChange={(e) => set("profit_loss", e.target.value)}
                invalid={!!errors.profit_loss} prefix="$" />
            </Field>
            <Field label="Risk : Reward" htmlFor="risk_reward">
              <Select id="risk_reward" value={form.risk_reward}
                onChange={(e) => set("risk_reward", e.target.value)}
                options={RISK_REWARD_OPTIONS as unknown as string[]}
                placeholder="Select R:R" />
            </Field>
            <Field label="Pips" htmlFor="pips">
              <Input id="pips" type="number" step="0.1"
                value={form.pips} onChange={(e) => set("pips", e.target.value)} />
            </Field>
            <Field label="Commission" htmlFor="commission">
              <Input id="commission" type="number" step="0.01"
                value={form.commission} onChange={(e) => set("commission", e.target.value)}
                prefix="$" />
            </Field>
            <Field label="Swap" htmlFor="swap">
              <Input id="swap" type="number" step="0.01"
                value={form.swap} onChange={(e) => set("swap", e.target.value)}
                prefix="$" />
            </Field>
            <Field label="Spread" htmlFor="spread">
              <Input id="spread" type="number" step="any"
                value={form.spread} onChange={(e) => set("spread", e.target.value)} />
            </Field>
            <Field label="Holding Time" htmlFor="holding_time" hint="e.g. 2h 15m">
              <Input id="holding_time" value={form.holding_time}
                onChange={(e) => set("holding_time", e.target.value)}
                placeholder="2h 15m" />
            </Field>
          </div>
        </Section>

        <Section title="Linked Daily Analysis">
          <Field label="Daily Analysis" htmlFor="daily_analysis_id"
            hint="Link this trade to the exact analysis you made before it.">
            <Select
              id="daily_analysis_id"
              value={analysisId ?? ""}
              onChange={(e) => setAnalysisId(e.target.value || null)}
              options={[
                { value: "", label: "— None —" },
                ...analyses.map((a) => ({
                  value: a.id,
                  label: `${formatDateMedium(new Date(a.analysis_date + "T00:00:00"))} · ${a.planned_direction ?? "—"} · ${a.status.replace(/_/g, " ")}`,
                })),
              ]}
            />
          </Field>
        </Section>

        <Section title="Market & Setup">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Strategy" htmlFor="strategy">
              <Select id="strategy" value={form.strategy}
                onChange={(e) => set("strategy", e.target.value)}
                options={STRATEGIES as unknown as string[]} placeholder="Select strategy" />
            </Field>
            <Field label="Setup Type" htmlFor="setup_type">
              <Select id="setup_type" value={form.setup_type}
                onChange={(e) => set("setup_type", e.target.value)}
                options={SETUP_TYPES as unknown as string[]} placeholder="Select setup" />
            </Field>
            <Field label="Timeframe" htmlFor="timeframe">
              <Select id="timeframe" value={form.timeframe}
                onChange={(e) => set("timeframe", e.target.value)}
                options={TIMEFRAMES as unknown as string[]} placeholder="Select timeframe" />
            </Field>
            <Field label="Session" htmlFor="session">
              <Select id="session" value={form.session}
                onChange={(e) => set("session", e.target.value)}
                options={SESSIONS as unknown as string[]} placeholder="Select session" />
            </Field>
            <Field label="Market Bias" htmlFor="market_bias">
              <Select id="market_bias" value={form.market_bias}
                onChange={(e) => set("market_bias", e.target.value)}
                options={MARKET_BIAS_OPTIONS as unknown as string[]} placeholder="Select bias" />
            </Field>
            <Field label="Entry Model" htmlFor="entry_model">
              <Select id="entry_model" value={form.entry_model}
                onChange={(e) => set("entry_model", e.target.value)}
                options={ENTRY_MODELS as unknown as string[]} placeholder="Select entry model" />
            </Field>
            <Field label="Liquidity Taken" htmlFor="liquidity_taken">
              <Select id="liquidity_taken" value={form.liquidity_taken}
                onChange={(e) => set("liquidity_taken", e.target.value)}
                options={LIQUIDITY_TAKEN_OPTIONS as unknown as string[]} placeholder="Select liquidity" />
            </Field>
            <Field label="News / Event" htmlFor="news_event">
              <Select id="news_event" value={form.news_event}
                onChange={(e) => set("news_event", e.target.value)}
                options={NEWS_EVENTS as unknown as string[]} placeholder="Select news event" />
            </Field>
          </div>
        </Section>

        <Section title="Entry">
          <TagPicker
            label="Entry reason tags"
            options={ENTRY_REASON_TAGS}
            value={entryTags}
            onChange={setEntryTags}
            allowCustom
          />
          <div className="mt-3">
            <Field label="Why did I actually enter?" htmlFor="entry_reason">
              <Textarea id="entry_reason" rows={2} value={form.entry_reason}
                onChange={(e) => set("entry_reason", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Exit & Management">
          <div className="space-y-4">
            <TagPicker
              label="Exit reason tags"
              options={EXIT_REASON_TAGS}
              value={exitTags}
              onChange={setExitTags}
              allowCustom
            />
            <Field label="Exit notes" htmlFor="exit_reason">
              <Textarea id="exit_reason" rows={2} value={form.exit_reason}
                onChange={(e) => set("exit_reason", e.target.value)} />
            </Field>
            <TagPicker
              label="Management tags"
              options={MANAGEMENT_TAGS}
              value={mgmtTags}
              onChange={setMgmtTags}
              allowCustom
            />
            <Field label="Management notes" htmlFor="management">
              <Textarea id="management" rows={2} value={form.management}
                onChange={(e) => set("management", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="What I Did Well">
          <TagPicker
            label="Well-executed tags"
            options={WELL_TAGS}
            value={wellTags}
            onChange={setWellTags}
            allowCustom
          />
          <div className="mt-3">
            <Field label="Notes" htmlFor="what_went_well">
              <Textarea id="what_went_well" rows={2} value={form.what_went_well}
                onChange={(e) => set("what_went_well", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Mistakes">
          <TagPicker
            label="Mistake tags"
            options={MISTAKE_TAGS}
            value={mistakeTags}
            onChange={setMistakeTags}
            allowCustom
          />
          <div className="mt-3">
            <Field label="Mistake notes" htmlFor="mistakes">
              <Textarea id="mistakes" rows={2} value={form.mistakes}
                onChange={(e) => set("mistakes", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Emotions">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TagPicker
              label="Before trade"
              options={EMOTION_TAGS}
              value={emoBefore}
              onChange={setEmoBefore}
            />
            <TagPicker
              label="After trade"
              options={EMOTION_TAGS}
              value={emoAfter}
              onChange={setEmoAfter}
            />
          </div>
          <div className="mt-3">
            <Field label="Emotion notes" htmlFor="emotions">
              <Textarea id="emotions" rows={2} value={form.emotions}
                onChange={(e) => set("emotions", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Market Observation">
          <TagPicker
            label="Market condition tags"
            options={MARKET_TAGS}
            value={marketTags}
            onChange={setMarketTags}
            allowCustom
          />
          <div className="mt-3">
            <Field label="What did the market teach me?" htmlFor="market_observation">
              <Textarea id="market_observation" rows={2} value={form.market_observation}
                onChange={(e) => set("market_observation", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Lesson Learned">
          <TagPicker
            label="Lesson tags"
            options={LESSON_TAGS}
            value={lessonTags}
            onChange={setLessonTags}
            allowCustom
          />
          <div className="mt-3">
            <Field label="Lesson notes" htmlFor="lesson">
              <Textarea id="lesson" rows={2} value={form.lesson}
                onChange={(e) => set("lesson", e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Result" htmlFor="result" required error={errors.result}>
              <Select id="result" value={form.result}
                onChange={(e) => set("result", e.target.value)}
                options={RESULTS as unknown as string[]}
                placeholder="Select result" invalid={!!errors.result} />
            </Field>
          </div>
        </Section>

        <Section title="Notes">
          <Field label="General notes" htmlFor="notes">
            <Textarea id="notes" rows={2} value={form.notes}
              onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </Section>

        <Section title="Screenshots">
          <ScreenshotUploader
            value={screenshots}
            onChange={setScreenshots}
            label="Trade screenshots"
            hint="Up to 6 images. Compressed automatically before upload."
            disabled={weeklyLimitReached}
          />
        </Section>
      </form>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="border-b border-border pb-2 text-2xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

