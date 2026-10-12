"use client";

import * as React from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "./Toggle";
import type { PersonalTradingPlan } from "@/lib/types";
import { SESSIONS, INSTRUMENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------- Shared ----------

export interface SectionProps {
  plan: Partial<PersonalTradingPlan>;
  patch: (patch: Partial<PersonalTradingPlan>) => void;
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const cls =
    cols === 1
      ? "grid grid-cols-1 gap-3"
      : cols === 3
        ? "grid grid-cols-1 gap-3 sm:grid-cols-3"
        : "grid grid-cols-1 gap-3 sm:grid-cols-2";
  return <div className={cls}>{children}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border pb-2">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-2xs text-ink-500">{subtitle}</p>}
    </div>
  );
}

// ---------- Section 1: Account & Capital ----------

export function CapitalSection({ plan, patch }: SectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Account & Capital"
        subtitle="Your personal account details. Never mixed with Maven settings."
      />
      <Grid>
        <Field label="Currency" htmlFor="plan_currency">
          <Select
            id="plan_currency"
            value={plan.currency ?? "USD"}
            onChange={(e) => patch({ currency: e.target.value })}
            options={["USD", "KES", "EUR", "GBP"]}
          />
        </Field>
        <Field
          label="Risk calculation basis"
          htmlFor="plan_risk_basis"
          hint="Which balance the risk % is calculated from."
        >
          <Select
            id="plan_risk_basis"
            value={plan.risk_basis ?? "balance"}
            onChange={(e) =>
              patch({ risk_basis: e.target.value as PersonalTradingPlan["risk_basis"] })
            }
            options={[
              { value: "balance", label: "Balance" },
              { value: "equity", label: "Equity" },
              { value: "starting_balance", label: "Starting Balance" },
            ]}
          />
        </Field>
        <Field label="Funding source" htmlFor="plan_funding" hint="Optional — e.g. savings, business">
          <Input
            id="plan_funding"
            value={plan.funding_source ?? ""}
            onChange={(e) => patch({ funding_source: e.target.value || null })}
            placeholder="Personal savings"
          />
        </Field>
      </Grid>
    </div>
  );
}

// ---------- Section 2: Risk Management ----------

export function RiskSection({ plan, patch }: SectionProps) {
  const limits = plan.limits_enabled ?? {};

  function toggleLimit(key: string, enabled: boolean) {
    patch({ limits_enabled: { ...limits, [key]: enabled } });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Risk Management"
        subtitle="Your personal risk preferences. Fully editable."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Default risk %" htmlFor="p_default_risk">
          <Input
            id="p_default_risk"
            type="number"
            step="0.01"
            value={plan.default_risk_percent ?? ""}
            onChange={(e) =>
              patch({ default_risk_percent: Number(e.target.value) || null })
            }
            suffix="%"
          />
        </Field>
        <Field label="Default fixed risk" htmlFor="p_default_fixed">
          <Input
            id="p_default_fixed"
            type="number"
            step="0.01"
            value={plan.default_fixed_risk ?? ""}
            onChange={(e) =>
              patch({ default_fixed_risk: Number(e.target.value) || null })
            }
            prefix="$"
          />
        </Field>
        <Field label="Maximum risk per trade" htmlFor="p_max_risk">
          <Input
            id="p_max_risk"
            type="number"
            step="0.01"
            value={plan.max_risk_percent ?? ""}
            onChange={(e) =>
              patch({ max_risk_percent: Number(e.target.value) || null })
            }
            suffix="%"
          />
        </Field>
        <Field label="High-quality setup risk" htmlFor="p_hq_risk">
          <Input
            id="p_hq_risk"
            type="number"
            step="0.01"
            value={plan.high_quality_risk_percent ?? ""}
            onChange={(e) =>
              patch({ high_quality_risk_percent: Number(e.target.value) || null })
            }
            suffix="%"
          />
        </Field>
        <Field label="Low-quality setup risk" htmlFor="p_lq_risk">
          <Input
            id="p_lq_risk"
            type="number"
            step="0.01"
            value={plan.low_quality_risk_percent ?? ""}
            onChange={(e) =>
              patch({ low_quality_risk_percent: Number(e.target.value) || null })
            }
            suffix="%"
          />
        </Field>
      </div>

      <div className="rounded border border-border bg-surface-soft p-3">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          Loss limits
        </div>
        <div className="mt-3 space-y-3">
          <LimitRow
            label="Daily loss limit"
            enabled={!!limits.max_daily_loss}
            onToggle={(v) => toggleLimit("max_daily_loss", v)}
          >
            <Input
              type="number"
              step="0.01"
              value={plan.max_daily_loss_percent ?? ""}
              onChange={(e) =>
                patch({ max_daily_loss_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
          </LimitRow>
          <LimitRow
            label="Weekly loss limit"
            enabled={!!limits.max_weekly_loss}
            onToggle={(v) => toggleLimit("max_weekly_loss", v)}
          >
            <Input
              type="number"
              step="0.01"
              value={plan.max_weekly_loss_percent ?? ""}
              onChange={(e) =>
                patch({ max_weekly_loss_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
          </LimitRow>
          <LimitRow
            label="Monthly loss limit"
            enabled={!!limits.max_monthly_loss}
            onToggle={(v) => toggleLimit("max_monthly_loss", v)}
          >
            <Input
              type="number"
              step="0.01"
              value={plan.max_monthly_loss_percent ?? ""}
              onChange={(e) =>
                patch({ max_monthly_loss_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
          </LimitRow>
          <LimitRow
            label="Maximum overall drawdown"
            enabled={!!limits.max_drawdown}
            onToggle={(v) => toggleLimit("max_drawdown", v)}
          >
            <Input
              type="number"
              step="0.01"
              value={plan.max_drawdown_percent ?? ""}
              onChange={(e) =>
                patch({ max_drawdown_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
          </LimitRow>
        </div>
      </div>

      <div className="rounded border border-border bg-surface-soft p-3">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          Trade frequency
        </div>
        <div className="mt-3 space-y-3">
          <LimitRow
            label="Max simultaneous open trades"
            enabled={!!limits.max_open_trades}
            onToggle={(v) => toggleLimit("max_open_trades", v)}
          >
            <Input
              type="number"
              value={plan.max_open_trades ?? ""}
              onChange={(e) =>
                patch({ max_open_trades: Number(e.target.value) || null })
              }
            />
          </LimitRow>
          <LimitRow
            label="Max trades per day"
            enabled={!!limits.max_trades_per_day}
            onToggle={(v) => toggleLimit("max_trades_per_day", v)}
          >
            <Input
              type="number"
              value={plan.max_trades_per_day ?? ""}
              onChange={(e) =>
                patch({ max_trades_per_day: Number(e.target.value) || null })
              }
            />
          </LimitRow>
          <LimitRow
            label="Max trades per week"
            enabled={!!limits.max_trades_per_week}
            onToggle={(v) => toggleLimit("max_trades_per_week", v)}
          >
            <Input
              type="number"
              value={plan.max_trades_per_week ?? ""}
              onChange={(e) =>
                patch({ max_trades_per_week: Number(e.target.value) || null })
              }
            />
          </LimitRow>
          <LimitRow
            label="Max trades per month"
            enabled={!!limits.max_trades_per_month}
            onToggle={(v) => toggleLimit("max_trades_per_month", v)}
          >
            <Input
              type="number"
              value={plan.max_trades_per_month ?? ""}
              onChange={(e) =>
                patch({ max_trades_per_month: Number(e.target.value) || null })
              }
            />
          </LimitRow>
        </div>
      </div>

      <div className="rounded border border-border bg-surface-soft p-3">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          Advanced
        </div>
        <div className="mt-3 space-y-3">
          <LimitRow
            label="Max aggregate open risk"
            enabled={!!limits.max_aggregate_risk}
            onToggle={(v) => toggleLimit("max_aggregate_risk", v)}
          >
            <Input
              type="number"
              step="0.01"
              value={plan.max_aggregate_open_risk_percent ?? ""}
              onChange={(e) =>
                patch({
                  max_aggregate_open_risk_percent: Number(e.target.value) || null,
                })
              }
              suffix="%"
            />
          </LimitRow>
          <LimitRow
            label="Max consecutive losses"
            enabled={!!limits.max_consecutive_losses}
            onToggle={(v) => toggleLimit("max_consecutive_losses", v)}
          >
            <Input
              type="number"
              value={plan.max_consecutive_losses ?? ""}
              onChange={(e) =>
                patch({ max_consecutive_losses: Number(e.target.value) || null })
              }
            />
          </LimitRow>
          <LimitRow
            label="Cooldown after loss"
            enabled={!!limits.cooldown}
            onToggle={(v) => toggleLimit("cooldown", v)}
          >
            <Input
              type="number"
              value={plan.cooldown_hours_after_loss ?? ""}
              onChange={(e) =>
                patch({
                  cooldown_hours_after_loss: Number(e.target.value) || null,
                })
              }
              suffix="h"
            />
          </LimitRow>
        </div>
      </div>
    </div>
  );
}

function LimitRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_140px_60px]">
      <label className="text-2xs text-ink-700">{label}</label>
      <div className={cn(!enabled && "opacity-40 pointer-events-none")}>
        {children}
      </div>
      <div className="flex justify-end">
        <Toggle value={enabled} onChange={onToggle} />
      </div>
    </div>
  );
}

// ---------- Section 3: Profit Targets ----------

export function TargetsSection({ plan, patch }: SectionProps) {
  const enabled = plan.targets_enabled ?? {};

  function toggle(key: string, v: boolean) {
    patch({ targets_enabled: { ...enabled, [key]: v } });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Profit Targets"
        subtitle="Planning preferences — not guaranteed returns."
      />
      <div className="space-y-3">
        <TargetRow
          label="Daily target"
          enabled={!!enabled.daily}
          onToggle={(v) => toggle("daily", v)}
        >
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              value={plan.daily_target_percent ?? ""}
              onChange={(e) =>
                patch({ daily_target_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
            <Input
              type="number"
              step="0.01"
              value={plan.daily_target_amount ?? ""}
              onChange={(e) =>
                patch({ daily_target_amount: Number(e.target.value) || null })
              }
              prefix="$"
            />
          </div>
        </TargetRow>
        <TargetRow
          label="Weekly target"
          enabled={!!enabled.weekly}
          onToggle={(v) => toggle("weekly", v)}
        >
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              value={plan.weekly_target_percent ?? ""}
              onChange={(e) =>
                patch({ weekly_target_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
            <Input
              type="number"
              step="0.01"
              value={plan.weekly_target_amount ?? ""}
              onChange={(e) =>
                patch({ weekly_target_amount: Number(e.target.value) || null })
              }
              prefix="$"
            />
          </div>
        </TargetRow>
        <TargetRow
          label="Monthly target"
          enabled={!!enabled.monthly}
          onToggle={(v) => toggle("monthly", v)}
        >
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              value={plan.monthly_target_percent ?? ""}
              onChange={(e) =>
                patch({ monthly_target_percent: Number(e.target.value) || null })
              }
              suffix="%"
            />
            <Input
              type="number"
              step="0.01"
              value={plan.monthly_target_amount ?? ""}
              onChange={(e) =>
                patch({ monthly_target_amount: Number(e.target.value) || null })
              }
              prefix="$"
            />
          </div>
        </TargetRow>
      </div>

      <Grid>
        <Field label="Minimum R:R" htmlFor="p_min_rr">
          <Input
            id="p_min_rr"
            type="number"
            step="0.01"
            value={plan.min_rr ?? ""}
            onChange={(e) =>
              patch({ min_rr: Number(e.target.value) || null })
            }
            suffix=":1"
          />
        </Field>
        <Field label="Preferred R:R" htmlFor="p_pref_rr">
          <Input
            id="p_pref_rr"
            type="number"
            step="0.01"
            value={plan.preferred_rr ?? ""}
            onChange={(e) =>
              patch({ preferred_rr: Number(e.target.value) || null })
            }
            suffix=":1"
          />
        </Field>
      </Grid>

      <div className="rounded border border-border bg-surface-soft p-3 space-y-2">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          Stopping rules
        </div>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.stop_after_daily_target ?? false}
            onChange={(e) => patch({ stop_after_daily_target: e.target.checked })}
          />
          Stop trading after daily target is reached
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.stop_after_weekly_target ?? false}
            onChange={(e) => patch({ stop_after_weekly_target: e.target.checked })}
          />
          Stop trading after weekly target is reached
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.stop_after_monthly_target ?? false}
            onChange={(e) => patch({ stop_after_monthly_target: e.target.checked })}
          />
          Stop trading after monthly target is reached
        </label>
      </div>
    </div>
  );
}

function TargetRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-2xs font-medium text-ink-800">{label}</span>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      <div className={cn(!enabled && "opacity-40 pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}

// ---------- Section 4: SL / TP ----------

export function SlTpSection({ plan, patch }: SectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Stop Loss & Take Profit"
        subtitle="Defaults for your own trades. No Maven limits applied."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="SL unit" htmlFor="p_sl_unit">
          <Select
            id="p_sl_unit"
            value={plan.sl_unit ?? "pips"}
            onChange={(e) =>
              patch({ sl_unit: e.target.value as PersonalTradingPlan["sl_unit"] })
            }
            options={[
              { value: "pips", label: "Pips" },
              { value: "points", label: "Points" },
              { value: "price", label: "Price" },
            ]}
          />
        </Field>
        <Field label="Default SL distance" htmlFor="p_default_sl">
          <Input
            id="p_default_sl"
            type="number"
            step="0.01"
            value={plan.default_sl_pips ?? ""}
            onChange={(e) =>
              patch({ default_sl_pips: Number(e.target.value) || null })
            }
          />
        </Field>
        <Field label="Default TP distance" htmlFor="p_default_tp">
          <Input
            id="p_default_tp"
            type="number"
            step="0.01"
            value={plan.default_tp_pips ?? ""}
            onChange={(e) =>
              patch({ default_tp_pips: Number(e.target.value) || null })
            }
          />
        </Field>
        <Field label="Min SL" htmlFor="p_min_sl">
          <Input
            id="p_min_sl"
            type="number"
            step="0.01"
            value={plan.min_sl_pips ?? ""}
            onChange={(e) =>
              patch({ min_sl_pips: Number(e.target.value) || null })
            }
          />
        </Field>
        <Field label="Max SL" htmlFor="p_max_sl">
          <Input
            id="p_max_sl"
            type="number"
            step="0.01"
            value={plan.max_sl_pips ?? ""}
            onChange={(e) =>
              patch({ max_sl_pips: Number(e.target.value) || null })
            }
          />
        </Field>
        <Field label="Preferred R:R for TP" htmlFor="p_pref_rr_tp">
          <Input
            id="p_pref_rr_tp"
            type="number"
            step="0.01"
            value={plan.preferred_rr_tp ?? ""}
            onChange={(e) =>
              patch({ preferred_rr_tp: Number(e.target.value) || null })
            }
            suffix=":1"
          />
        </Field>
        <Field label="TP method" htmlFor="p_tp_method">
          <Select
            id="p_tp_method"
            value={plan.tp_method ?? "rr"}
            onChange={(e) =>
              patch({ tp_method: e.target.value as PersonalTradingPlan["tp_method"] })
            }
            options={[
              { value: "rr", label: "By R:R" },
              { value: "pips", label: "Fixed pips" },
              { value: "price", label: "Price target" },
              { value: "atr", label: "ATR-based" },
              { value: "other", label: "Other" },
            ]}
          />
        </Field>
        <Field label="Minimum expected reward" htmlFor="p_min_reward">
          <Input
            id="p_min_reward"
            type="number"
            step="0.01"
            value={plan.min_expected_reward ?? ""}
            onChange={(e) =>
              patch({ min_expected_reward: Number(e.target.value) || null })
            }
            prefix="$"
          />
        </Field>
        <Field label="Preferred exit method" htmlFor="p_exit_method">
          <Input
            id="p_exit_method"
            value={plan.preferred_exit_method ?? ""}
            onChange={(e) =>
              patch({ preferred_exit_method: e.target.value || null })
            }
            placeholder="e.g. TP hit, or trailing"
          />
        </Field>
      </div>
    </div>
  );
}

// ---------- Section 5: Position Sizing ----------

export function SizingSection({ plan, patch }: SectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Position Sizing"
        subtitle="Lot size preferences. Applied by the Position Calculator."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Min lot size" htmlFor="p_min_lot">
          <Input
            id="p_min_lot"
            type="number"
            step="0.01"
            value={plan.min_lot_size ?? ""}
            onChange={(e) =>
              patch({ min_lot_size: Number(e.target.value) || null })
            }
          />
        </Field>
        <Field label="Max lot size" htmlFor="p_max_lot">
          <Input
            id="p_max_lot"
            type="number"
            step="0.01"
            value={plan.max_lot_size ?? ""}
            onChange={(e) =>
              patch({ max_lot_size: Number(e.target.value) || null })
            }
          />
        </Field>
        <Field label="Lot increment" htmlFor="p_lot_inc">
          <Input
            id="p_lot_inc"
            type="number"
            step="0.01"
            value={plan.lot_increment ?? ""}
            onChange={(e) =>
              patch({ lot_increment: Number(e.target.value) || null })
            }
          />
        </Field>
      </div>

      <div className="rounded border border-border bg-surface-soft p-3 space-y-2">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          Optional management
        </div>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.breakeven_enabled ?? false}
            onChange={(e) => patch({ breakeven_enabled: e.target.checked })}
          />
          Move SL to breakeven at
          <Input
            type="number"
            step="0.1"
            value={plan.breakeven_at_rr ?? ""}
            onChange={(e) =>
              patch({ breakeven_at_rr: Number(e.target.value) || null })
            }
            className="ml-1 h-6 w-16 px-1 text-3xs"
            suffix="R"
          />
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.partial_close_enabled ?? false}
            onChange={(e) => patch({ partial_close_enabled: e.target.checked })}
          />
          Partial close at
          <Input
            type="number"
            step="0.1"
            value={plan.partial_close_at_rr ?? ""}
            onChange={(e) =>
              patch({ partial_close_at_rr: Number(e.target.value) || null })
            }
            className="ml-1 h-6 w-16 px-1 text-3xs"
            suffix="R"
          />
          <Input
            type="number"
            step="1"
            value={plan.partial_close_percent ?? ""}
            onChange={(e) =>
              patch({ partial_close_percent: Number(e.target.value) || null })
            }
            className="ml-1 h-6 w-16 px-1 text-3xs"
            suffix="%"
          />
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.trailing_stop_enabled ?? false}
            onChange={(e) => patch({ trailing_stop_enabled: e.target.checked })}
          />
          Use a trailing stop
        </label>
      </div>
    </div>
  );
}

// ---------- Section 6: Strategy & Discipline ----------

export function StrategySection({ plan, patch }: SectionProps) {
  const toggleArrayItem = (
    field: "preferred_instruments" | "preferred_sessions" | "permitted_setups",
    item: string
  ) => {
    const current = (plan[field] as string[] | null) ?? [];
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    patch({ [field]: next } as Partial<PersonalTradingPlan>);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Strategy & Discipline"
        subtitle="Your own trading preferences. Never overwritten by Maven."
      />

      <div>
        <div className="text-2xs font-medium uppercase tracking-wide text-ink-600">
          Preferred instruments
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {INSTRUMENTS.map((inst) => {
            const active = (plan.preferred_instruments ?? []).includes(inst);
            return (
              <button
                key={inst}
                type="button"
                onClick={() => toggleArrayItem("preferred_instruments", inst)}
                className={cn(
                  "rounded border px-2 py-0.5 text-3xs transition-colors",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border text-ink-600 hover:bg-surface-muted"
                )}
              >
                {inst}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-2xs font-medium uppercase tracking-wide text-ink-600">
          Preferred sessions
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SESSIONS.map((s) => {
            const active = (plan.preferred_sessions ?? []).includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleArrayItem("preferred_sessions", s)}
                className={cn(
                  "rounded border px-2 py-0.5 text-3xs transition-colors",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border text-ink-600 hover:bg-surface-muted"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded border border-border bg-surface-soft p-3 space-y-2">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          Confirmation requirements
        </div>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.require_htf_confirmation ?? false}
            onChange={(e) => patch({ require_htf_confirmation: e.target.checked })}
          />
          Require higher-timeframe confirmation
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.require_market_structure ?? false}
            onChange={(e) => patch({ require_market_structure: e.target.checked })}
          />
          Require clear market structure
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.require_liquidity_conditions ?? false}
            onChange={(e) => patch({ require_liquidity_conditions: e.target.checked })}
          />
          Require liquidity conditions
        </label>
        <label className="flex items-center gap-2 text-2xs text-ink-700">
          <input
            type="checkbox"
            checked={plan.require_entry_confirmation ?? false}
            onChange={(e) => patch({ require_entry_confirmation: e.target.checked })}
          />
          Require entry confirmation candle
        </label>
      </div>

      <Grid>
        <Field label="Minimum setup quality" htmlFor="p_min_quality">
          <Select
            id="p_min_quality"
            value={plan.min_setup_quality ?? ""}
            onChange={(e) =>
              patch({
                min_setup_quality: (e.target.value || null) as PersonalTradingPlan["min_setup_quality"],
              })
            }
            options={["Low", "Medium", "High"]}
            placeholder="Not specified"
          />
        </Field>
        <Field label="Confidence requirement" htmlFor="p_conf">
          <Select
            id="p_conf"
            value={plan.confidence_requirement ?? ""}
            onChange={(e) =>
              patch({
                confidence_requirement: (e.target.value || null) as PersonalTradingPlan["confidence_requirement"],
              })
            }
            options={["Low", "Medium", "High"]}
            placeholder="Not specified"
          />
        </Field>
        <Field label="News restrictions" htmlFor="p_news">
          <Input
            id="p_news"
            value={plan.news_restrictions ?? ""}
            onChange={(e) => patch({ news_restrictions: e.target.value || null })}
            placeholder="e.g. No trades 30 min before/after high-impact news"
          />
        </Field>
        <Field label="Max risk for low-quality setups" htmlFor="p_max_lq_risk">
          <Input
            id="p_max_lq_risk"
            type="number"
            step="0.01"
            value={plan.max_low_quality_risk_percent ?? ""}
            onChange={(e) =>
              patch({ max_low_quality_risk_percent: Number(e.target.value) || null })
            }
            suffix="%"
          />
        </Field>
      </Grid>

      <Field
        label="Approval mode"
        htmlFor="p_approval"
        hint="How Trade Check responds when your plan conditions are not met."
      >
        <Select
          id="p_approval"
          value={plan.approval_mode ?? "warning"}
          onChange={(e) =>
            patch({ approval_mode: e.target.value as PersonalTradingPlan["approval_mode"] })
          }
          options={[
            { value: "informational", label: "Informational — just show status" },
            { value: "warning", label: "Warning — flag but allow" },
            { value: "block", label: "Block — don't mark ready until fixed" },
          ]}
        />
      </Field>
    </div>
  );
}

// ---------- Section 7: Schedule ----------

export function ScheduleSection({ plan, patch }: SectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Trading Schedule"
        subtitle="When you normally trade."
      />
      <Grid>
        <Field label="Active from" htmlFor="p_active_from">
          <Input
            id="p_active_from"
            type="time"
            value={plan.active_from ?? ""}
            onChange={(e) => patch({ active_from: e.target.value || null })}
          />
        </Field>
        <Field label="Active to" htmlFor="p_active_to">
          <Input
            id="p_active_to"
            type="time"
            value={plan.active_to ?? ""}
            onChange={(e) => patch({ active_to: e.target.value || null })}
          />
        </Field>
        <Field label="Timezone" htmlFor="p_tz">
          <Input
            id="p_tz"
            value={plan.active_timezone ?? "UTC"}
            onChange={(e) => patch({ active_timezone: e.target.value || "UTC" })}
          />
        </Field>
      </Grid>
      <Field label="Notes" htmlFor="p_notes">
        <Textarea
          id="p_notes"
          rows={3}
          value={plan.notes ?? ""}
          onChange={(e) => patch({ notes: e.target.value || null })}
          placeholder="Anything else worth keeping with this plan"
        />
      </Field>
    </div>
  );
}
