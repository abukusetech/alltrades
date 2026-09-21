"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  ScreenshotUploader,
  type UploadedScreenshot,
} from "@/components/ui/ScreenshotUploader";
import { useToast } from "@/components/ui/Toast";
import { createAnalysis, updateAnalysis } from "@/lib/data/analyses";
import {
  addAnalysisScreenshot,
  listAnalysisScreenshots,
  removeAnalysisScreenshot,
} from "@/lib/data/analysis-screenshots";
import { getSignedUrl, uploadScreenshot } from "@/lib/data/screenshots";
import {
  INSTRUMENTS,
  TIMEFRAMES,
  SESSIONS,
  MARKET_BIAS_OPTIONS,
  MARKET_STRUCTURE_OPTIONS,
  LIQUIDITY_FOCUS_OPTIONS,
  FVG_OPTIONS,
  ORDER_BLOCK_OPTIONS,
  BOS_CHOCH_OPTIONS,
  ANALYSIS_SETUPS,
  RISK_REWARD_OPTIONS,
  CONFIDENCE_LEVELS,
  ANALYSIS_OUTCOMES,
} from "@/lib/constants";
import type { Account, Analysis, AnalysisOutcome } from "@/lib/types";
import { emptyToNull, parseNumberOrNull, toDateKey } from "@/lib/utils";

export interface AnalysisFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account: Account;
  editing?: Analysis | null;
}

type FormState = {
  analysis_date: string;
  analysis_time: string;
  instrument: string;
  timeframe: string;
  session: string;
  market_bias: string;
  market_structure: string;
  prev_week_high: string;
  prev_week_low: string;
  prev_day_high: string;
  prev_day_low: string;
  liquidity_focus: string;
  support_resistance: string;
  fair_value_gap: string;
  order_blocks: string;
  bos_choch: string;
  setup: string;
  prediction: string;
  entry_zone: string;
  invalidation: string;
  stop_loss: string;
  take_profit: string;
  expected_rr: string;
  confidence: string;
  outcome: AnalysisOutcome;
  actual_move: string;
  lessons: string;
  notes: string;
};

function initialState(a?: Analysis | null): FormState {
  return {
    analysis_date: a?.analysis_date ?? toDateKey(new Date()),
    analysis_time: a?.analysis_time?.slice(0, 5) ?? "",
    instrument: a?.instrument ?? "",
    timeframe: a?.timeframe ?? "",
    session: a?.session ?? "",
    market_bias: a?.market_bias ?? "",
    market_structure: a?.market_structure ?? "",
    prev_week_high: a?.prev_week_high != null ? String(a.prev_week_high) : "",
    prev_week_low: a?.prev_week_low != null ? String(a.prev_week_low) : "",
    prev_day_high: a?.prev_day_high != null ? String(a.prev_day_high) : "",
    prev_day_low: a?.prev_day_low != null ? String(a.prev_day_low) : "",
    liquidity_focus: a?.liquidity_focus ?? "",
    support_resistance: a?.support_resistance ?? "",
    fair_value_gap: a?.fair_value_gap ?? "",
    order_blocks: a?.order_blocks ?? "",
    bos_choch: a?.bos_choch ?? "",
    setup: a?.setup ?? "",
    prediction: a?.prediction ?? "",
    entry_zone: a?.entry_zone ?? "",
    invalidation: a?.invalidation ?? "",
    stop_loss: a?.stop_loss != null ? String(a.stop_loss) : "",
    take_profit: a?.take_profit != null ? String(a.take_profit) : "",
    expected_rr: a?.expected_rr ?? "",
    confidence: a?.confidence ?? "",
    outcome: (a?.outcome as AnalysisOutcome) ?? "Still Pending",
    actual_move: a?.actual_move ?? "",
    lessons: a?.lessons ?? "",
    notes: a?.notes ?? "",
  };
}

export function AnalysisFormModal({
  open,
  onClose,
  onSaved,
  account,
  editing,
}: AnalysisFormModalProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const isEdit = !!editing;

  const [form, setForm] = React.useState<FormState>(() => initialState(editing));
  const [screenshots, setScreenshots] = React.useState<UploadedScreenshot[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(initialState(editing));
    setErrors({});
    setScreenshots([]);
    if (editing) {
      (async () => {
        try {
          const rows = await listAnalysisScreenshots(supabase, editing.id);
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
          setScreenshots(withUrls.filter((s) => !!s.url));
        } catch {
          // best effort
        }
      })();
    }
  }, [open, editing, supabase]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.analysis_date) next.analysis_date = "Date is required.";
    if (!form.instrument) next.instrument = "Instrument is required.";
    if (!form.prediction.trim()) next.prediction = "Prediction is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      const payload = {
        account_id: account.id,
        analysis_date: form.analysis_date,
        analysis_time: form.analysis_time ? `${form.analysis_time}:00` : null,
        instrument: form.instrument,
        timeframe: emptyToNull(form.timeframe),
        session: emptyToNull(form.session),
        market_bias: emptyToNull(form.market_bias),
        market_structure: emptyToNull(form.market_structure),
        prev_week_high: parseNumberOrNull(form.prev_week_high),
        prev_week_low: parseNumberOrNull(form.prev_week_low),
        prev_day_high: parseNumberOrNull(form.prev_day_high),
        prev_day_low: parseNumberOrNull(form.prev_day_low),
        liquidity_focus: emptyToNull(form.liquidity_focus),
        support_resistance: emptyToNull(form.support_resistance),
        fair_value_gap: emptyToNull(form.fair_value_gap),
        order_blocks: emptyToNull(form.order_blocks),
        bos_choch: emptyToNull(form.bos_choch),
        setup: emptyToNull(form.setup),
        prediction: form.prediction.trim(),
        entry_zone: emptyToNull(form.entry_zone),
        invalidation: emptyToNull(form.invalidation),
        stop_loss: parseNumberOrNull(form.stop_loss),
        take_profit: parseNumberOrNull(form.take_profit),
        expected_rr: emptyToNull(form.expected_rr),
        confidence: emptyToNull(form.confidence),
        outcome: form.outcome,
        actual_move: emptyToNull(form.actual_move),
        lessons: emptyToNull(form.lessons),
        notes: emptyToNull(form.notes),
      };

      let saved: Analysis;
      if (isEdit && editing) {
        saved = await updateAnalysis(supabase, editing.id, payload);
      } else {
        saved = await createAnalysis(supabase, user.id, payload);
      }

      // Upload pending screenshots
      for (const s of screenshots) {
        if (s.file && !s.storagePath) {
          try {
            const { path } = await uploadScreenshot(
              supabase,
              user.id,
              `analyses/${saved.id}`,
              s.file
            );
            await addAnalysisScreenshot(supabase, user.id, saved.id, path);
          } catch (err) {
            console.warn("Analysis screenshot upload failed", err);
          }
        }
      }

      // Remove deleted existing screenshots
      if (isEdit && editing) {
        const existing = await listAnalysisScreenshots(supabase, editing.id);
        const keptIds = new Set(
          screenshots.filter((s) => s.id).map((s) => s.id as string)
        );
        for (const r of existing) {
          if (!keptIds.has(r.id)) {
            await removeAnalysisScreenshot(supabase, r.id);
          }
        }
      }

      toast.success(isEdit ? "Analysis updated" : "Analysis saved");
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save analysis.";
      toast.error("Could not save analysis", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Analysis" : "New Analysis"}
      description="Capture the market read before execution and review it after the move."
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {isEdit ? "Save changes" : "Save analysis"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {/* Market Context */}
        <Section title="Market Context">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date" htmlFor="analysis_date" required error={errors.analysis_date}>
              <Input
                id="analysis_date"
                type="date"
                value={form.analysis_date}
                onChange={(e) => set("analysis_date", e.target.value)}
                invalid={!!errors.analysis_date}
              />
            </Field>
            <Field label="Time" htmlFor="analysis_time">
              <Input
                id="analysis_time"
                type="time"
                value={form.analysis_time}
                onChange={(e) => set("analysis_time", e.target.value)}
              />
            </Field>
            <Field label="Instrument" htmlFor="instrument" required error={errors.instrument}>
              <Select
                id="instrument"
                value={form.instrument}
                onChange={(e) => set("instrument", e.target.value)}
                options={INSTRUMENTS as unknown as string[]}
                placeholder="Select instrument"
                invalid={!!errors.instrument}
              />
            </Field>
            <Field label="Timeframe" htmlFor="timeframe">
              <Select
                id="timeframe"
                value={form.timeframe}
                onChange={(e) => set("timeframe", e.target.value)}
                options={TIMEFRAMES as unknown as string[]}
                placeholder="Select timeframe"
              />
            </Field>
            <Field label="Session" htmlFor="session">
              <Select
                id="session"
                value={form.session}
                onChange={(e) => set("session", e.target.value)}
                options={SESSIONS as unknown as string[]}
                placeholder="Select session"
              />
            </Field>
            <Field label="Market Bias" htmlFor="market_bias">
              <Select
                id="market_bias"
                value={form.market_bias}
                onChange={(e) => set("market_bias", e.target.value)}
                options={MARKET_BIAS_OPTIONS as unknown as string[]}
                placeholder="Select bias"
              />
            </Field>
            <Field label="Market Structure" htmlFor="market_structure">
              <Select
                id="market_structure"
                value={form.market_structure}
                onChange={(e) => set("market_structure", e.target.value)}
                options={MARKET_STRUCTURE_OPTIONS as unknown as string[]}
                placeholder="Select structure"
              />
            </Field>
          </div>
        </Section>

        {/* Liquidity & Key Levels */}
        <Section title="Liquidity & Key Levels">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Previous Week High" htmlFor="prev_week_high">
              <Input
                id="prev_week_high"
                type="number"
                step="any"
                value={form.prev_week_high}
                onChange={(e) => set("prev_week_high", e.target.value)}
              />
            </Field>
            <Field label="Previous Week Low" htmlFor="prev_week_low">
              <Input
                id="prev_week_low"
                type="number"
                step="any"
                value={form.prev_week_low}
                onChange={(e) => set("prev_week_low", e.target.value)}
              />
            </Field>
            <Field label="Previous Day High" htmlFor="prev_day_high">
              <Input
                id="prev_day_high"
                type="number"
                step="any"
                value={form.prev_day_high}
                onChange={(e) => set("prev_day_high", e.target.value)}
              />
            </Field>
            <Field label="Previous Day Low" htmlFor="prev_day_low">
              <Input
                id="prev_day_low"
                type="number"
                step="any"
                value={form.prev_day_low}
                onChange={(e) => set("prev_day_low", e.target.value)}
              />
            </Field>
            <Field label="Liquidity Focus" htmlFor="liquidity_focus">
              <Select
                id="liquidity_focus"
                value={form.liquidity_focus}
                onChange={(e) => set("liquidity_focus", e.target.value)}
                options={LIQUIDITY_FOCUS_OPTIONS as unknown as string[]}
                placeholder="Select focus"
              />
            </Field>
            <Field label="Support & Resistance" htmlFor="support_resistance">
              <Input
                id="support_resistance"
                value={form.support_resistance}
                onChange={(e) => set("support_resistance", e.target.value)}
                placeholder="e.g. 1.0850 support / 1.0950 resistance"
              />
            </Field>
          </div>
        </Section>

        {/* ICT / SMC Setup */}
        <Section title="ICT / SMC Setup">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Fair Value Gap" htmlFor="fair_value_gap">
              <Select
                id="fair_value_gap"
                value={form.fair_value_gap}
                onChange={(e) => set("fair_value_gap", e.target.value)}
                options={FVG_OPTIONS as unknown as string[]}
                placeholder="Select FVG"
              />
            </Field>
            <Field label="Order Blocks" htmlFor="order_blocks">
              <Select
                id="order_blocks"
                value={form.order_blocks}
                onChange={(e) => set("order_blocks", e.target.value)}
                options={ORDER_BLOCK_OPTIONS as unknown as string[]}
                placeholder="Select order blocks"
              />
            </Field>
            <Field label="BOS / CHOCH" htmlFor="bos_choch">
              <Select
                id="bos_choch"
                value={form.bos_choch}
                onChange={(e) => set("bos_choch", e.target.value)}
                options={BOS_CHOCH_OPTIONS as unknown as string[]}
                placeholder="Select BOS/CHOCH"
              />
            </Field>
            <Field label="Setup" htmlFor="setup">
              <Select
                id="setup"
                value={form.setup}
                onChange={(e) => set("setup", e.target.value)}
                options={ANALYSIS_SETUPS as unknown as string[]}
                placeholder="Select setup"
              />
            </Field>
          </div>
        </Section>

        {/* Prediction & Trade Plan */}
        <Section title="Prediction & Trade Plan">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Prediction"
              htmlFor="prediction"
              required
              error={errors.prediction}
              className="sm:col-span-2 lg:col-span-3"
            >
              <Textarea
                id="prediction"
                rows={3}
                value={form.prediction}
                onChange={(e) => set("prediction", e.target.value)}
                invalid={!!errors.prediction}
                placeholder="Describe the expected move — direction, key level, liquidity target."
              />
            </Field>
            <Field label="Entry Zone" htmlFor="entry_zone">
              <Input
                id="entry_zone"
                value={form.entry_zone}
                onChange={(e) => set("entry_zone", e.target.value)}
                placeholder="e.g. 1.0900 – 1.0910"
              />
            </Field>
            <Field label="Invalidation" htmlFor="invalidation">
              <Input
                id="invalidation"
                value={form.invalidation}
                onChange={(e) => set("invalidation", e.target.value)}
                placeholder="Level that would invalidate the idea"
              />
            </Field>
            <Field label="Stop Loss" htmlFor="stop_loss">
              <Input
                id="stop_loss"
                type="number"
                step="any"
                value={form.stop_loss}
                onChange={(e) => set("stop_loss", e.target.value)}
              />
            </Field>
            <Field label="Take Profit" htmlFor="take_profit">
              <Input
                id="take_profit"
                type="number"
                step="any"
                value={form.take_profit}
                onChange={(e) => set("take_profit", e.target.value)}
              />
            </Field>
            <Field label="Expected R:R" htmlFor="expected_rr">
              <Select
                id="expected_rr"
                value={form.expected_rr}
                onChange={(e) => set("expected_rr", e.target.value)}
                options={RISK_REWARD_OPTIONS as unknown as string[]}
                placeholder="Select R:R"
              />
            </Field>
            <Field label="Confidence" htmlFor="confidence">
              <Select
                id="confidence"
                value={form.confidence}
                onChange={(e) => set("confidence", e.target.value)}
                options={CONFIDENCE_LEVELS as unknown as string[]}
                placeholder="Select confidence"
              />
            </Field>
          </div>
        </Section>

        {/* Chart Evidence */}
        <Section title="Chart Evidence">
          <ScreenshotUploader
            value={screenshots}
            onChange={setScreenshots}
            label="Chart screenshots"
            hint="Add the same chart you used for your prediction. This makes your later review objective instead of relying on memory."
          />
        </Section>

        {/* Post-Market Review */}
        <Section title="Post-Market Review">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prediction Outcome" htmlFor="outcome">
              <Select
                id="outcome"
                value={form.outcome}
                onChange={(e) => set("outcome", e.target.value as AnalysisOutcome)}
                options={ANALYSIS_OUTCOMES as unknown as string[]}
              />
            </Field>
            <Field label="Actual Move" htmlFor="actual_move">
              <Textarea
                id="actual_move"
                rows={2}
                value={form.actual_move}
                onChange={(e) => set("actual_move", e.target.value)}
                placeholder="What actually happened"
              />
            </Field>
            <Field label="Lessons" htmlFor="lessons">
              <Textarea
                id="lessons"
                rows={2}
                value={form.lessons}
                onChange={(e) => set("lessons", e.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
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
