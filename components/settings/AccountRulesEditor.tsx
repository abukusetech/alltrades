"use client";

import * as React from "react";
import { Save, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import type { Account, MavenRules } from "@/lib/types";

type ExtendedPropRules = MavenRules & {
  program_label?: string | null;
  evaluation_steps?: number | null;
  phase?: string | null;
  profit_target_percent?: number | null;
  phase_two_profit_target_percent?: number | null;
  min_payout_profit_percent?: number | null;
  firm_profit_share_percent?: number | null;
};

type FormState = {
  provider: string;
  program: string;
  evaluationSteps: string;
  phase: string;
  dailyLoss: string;
  dailyReset: string;
  maxDrawdown: string;
  drawdownMethod: string;
  floatingLoss: string;
  riskPerTrade: string;
  profitTarget: string;
  phaseTwoTarget: string;
  withdrawalTarget: string;
  consistency: string;
  consistencyRequired: boolean;
  traderSplit: string;
  minPayout: string;
  minTradingDays: string;
  maxWeeklyTrades: string;
  maxDailyTrades: string;
  maxMonthlyTrades: string;
  personalRisk: string;
  personalDailyLoss: string;
  personalMaxDrawdown: string;
  allowedInstruments: string;
  minSl: string;
  maxSl: string;
  minRr: string;
  restrictNews: boolean;
  noRiskIncrease: boolean;
  restrictions: string;
};

function asString(value: number | string | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function makeForm(account: Account): FormState {
  const rules = (account.maven_rules ?? {}) as ExtendedPropRules;
  return {
    provider: account.account_type === "PERSONAL"
      ? account.broker ?? ""
      : account.funding_source ?? "",
    program: rules.program_label ?? rules.program ?? "",
    evaluationSteps: asString(rules.evaluation_steps),
    phase: rules.phase ?? "",
    dailyLoss: asString(account.max_daily_drawdown_percent),
    dailyReset: rules.reset_time_utc ?? "",
    maxDrawdown: asString(account.max_total_drawdown_percent),
    drawdownMethod: rules.drawdown_method ?? "",
    floatingLoss: asString(account.max_floating_loss_percent),
    riskPerTrade: asString(rules.max_risk_per_trade_percent),
    profitTarget: asString(rules.profit_target_percent),
    phaseTwoTarget: asString(rules.phase_two_profit_target_percent),
    withdrawalTarget: asString(account.withdrawal_target_percent),
    consistency: asString(account.max_consistency_percent),
    consistencyRequired: rules.consistency_required ?? false,
    traderSplit: asString(rules.profit_split_percent),
    minPayout: asString(rules.min_payout_profit_percent ?? rules.min_payout_amount),
    minTradingDays: asString(rules.min_trading_days),
    maxWeeklyTrades: asString(account.max_weekly_trades),
    maxDailyTrades: asString(account.max_daily_trades),
    maxMonthlyTrades: asString(account.max_monthly_trades),
    personalRisk: asString(account.personal_risk_percent),
    personalDailyLoss: asString(account.personal_daily_loss_percent),
    personalMaxDrawdown: asString(account.personal_max_drawdown_percent),
    allowedInstruments: account.allowed_instrument ?? "",
    minSl: asString(account.min_sl_pips),
    maxSl: asString(account.max_sl_pips),
    minRr: asString(account.min_rr),
    restrictNews: account.forbid_high_impact_news ?? false,
    noRiskIncrease: account.no_risk_increase_after_loss ?? false,
    restrictions: rules.trading_restrictions ?? rules.notes ?? "",
  };
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const inputClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-xs text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AccountRulesEditor() {
  const { currentAccount, accounts } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [form, setForm] = React.useState<FormState | null>(null);
  const [original, setOriginal] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!currentAccount) {
      setForm(null);
      setOriginal(null);
      return;
    }
    const next = makeForm(currentAccount);
    setForm(next);
    setOriginal(next);
  }, [currentAccount]);

  const dirty = !!form && !!original && JSON.stringify(form) !== JSON.stringify(original);
  const isPersonal = currentAccount?.account_type === "PERSONAL";
  const isPropFirm = currentAccount?.account_type === "MAVEN";

  function patch(values: Partial<FormState>) {
    setForm((previous) => previous ? { ...previous, ...values } : previous);
  }

  async function onSave() {
    if (!currentAccount || !form) return;

    const numericFields = [
      ["Daily loss limit", form.dailyLoss],
      ["Maximum drawdown", form.maxDrawdown],
      ["Floating loss", form.floatingLoss],
      ["Maximum weekly trades", form.maxWeeklyTrades],
    ] as const;
    for (const [label, value] of numericFields) {
      if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0) {
        toast.error("Check your rule values", label + " must be zero or greater.");
        return;
      }
    }

    setSaving(true);
    try {
      const rules = { ...((currentAccount.maven_rules ?? {}) as ExtendedPropRules) };
      if (isPropFirm) {
        Object.assign(rules, {
          program_label: form.program.trim() || null,
          evaluation_steps: numberOrNull(form.evaluationSteps),
          phase: form.phase.trim() || null,
          daily_loss_percent: numberOrNull(form.dailyLoss),
          reset_time_utc: form.dailyReset.trim() || null,
          max_drawdown_percent: numberOrNull(form.maxDrawdown),
          drawdown_method: form.drawdownMethod || null,
          max_risk_per_trade_percent: numberOrNull(form.riskPerTrade),
          profit_target_percent: numberOrNull(form.profitTarget),
          phase_two_profit_target_percent: numberOrNull(form.phaseTwoTarget),
          consistency_required: form.consistencyRequired,
          max_consistency_percent: numberOrNull(form.consistency),
          profit_split_percent: numberOrNull(form.traderSplit),
          min_payout_profit_percent: numberOrNull(form.minPayout),
          min_trading_days: numberOrNull(form.minTradingDays),
          max_weekly_trades: numberOrNull(form.maxWeeklyTrades),
          max_monthly_trades: numberOrNull(form.maxMonthlyTrades),
          trading_restrictions: form.restrictions.trim() || null,
        });
      }

      const updates: Record<string, unknown> = {
        max_weekly_trades: Number(form.maxWeeklyTrades),
        max_daily_trades: numberOrNull(form.maxDailyTrades),
        max_monthly_trades: numberOrNull(form.maxMonthlyTrades),
        max_daily_drawdown_percent: Number(form.dailyLoss),
        max_total_drawdown_percent: Number(form.maxDrawdown),
        max_floating_loss_percent: Number(form.floatingLoss),
        withdrawal_target_percent: numberOrNull(form.withdrawalTarget) ?? 0,
        max_consistency_percent: numberOrNull(form.consistency) ?? 0,
        allowed_instrument: form.allowedInstruments.trim() || null,
        min_sl_pips: numberOrNull(form.minSl),
        max_sl_pips: numberOrNull(form.maxSl),
        min_rr: numberOrNull(form.minRr),
        forbid_high_impact_news: form.restrictNews,
        no_risk_increase_after_loss: form.noRiskIncrease,
      };

      if (isPersonal) {
        updates.broker = form.provider.trim() || null;
        updates.personal_risk_percent = numberOrNull(form.personalRisk);
        updates.personal_daily_loss_percent = numberOrNull(form.personalDailyLoss);
        updates.personal_max_drawdown_percent = numberOrNull(form.personalMaxDrawdown);
      } else if (isPropFirm) {
        updates.funding_source = form.provider.trim() || null;
        updates.maven_rules = rules;
      }

      const { data, error } = await supabase
        .from("accounts")
        .update(updates)
        .eq("id", currentAccount.id)
        .select("*")
        .single();
      if (error) throw error;

      const savedAccount = data as Account;
      const next = makeForm(savedAccount);
      setForm(next);
      setOriginal(next);
      toast.success("Account rules saved", "These settings now apply to this account.");
      window.location.reload();
    } catch (error) {
      toast.error(
        "Could not save account rules",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (accounts.length === 0 || !currentAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Rules</CardTitle>
          <Badge tone="neutral">No account selected</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-ink-500">Create a trading account to configure its rules and limits.</p>
        </CardBody>
      </Card>
    );
  }

  if (currentAccount.account_type === "UNCLASSIFIED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Rules</CardTitle>
          <Badge tone="warn">Classification needed</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-xs text-ink-600">Classify this account as a prop firm account or personal capital account before configuring its rules.</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {isPersonal ? <UserRound className="h-4 w-4 text-profit-text" /> : <ShieldCheck className="h-4 w-4 text-brand-600" />}
          <CardTitle>Account Rules & Limits</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge tone="warn">Unsaved</Badge>}
          {!dirty && <Badge tone="profit">Saved</Badge>}
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="rounded-lg border border-border bg-surface-soft p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-900">
            <SlidersHorizontal className="h-4 w-4 text-brand-600" />
            {currentAccount.name}
          </div>
          <p className="mt-1 text-2xs leading-relaxed text-ink-500">
            Rules are saved separately for each account. Set only the limits that apply to this account; use 0 for a limit that does not apply.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={isPersonal ? "Broker" : "Prop firm"} htmlFor="account-provider">
            <Input id="account-provider" value={form.provider} onChange={(e) => patch({ provider: e.target.value })} placeholder={isPersonal ? "e.g. IC Markets" : "e.g. FTMO, Maven, The5ers"} />
          </Field>
          {isPropFirm ? (
            <Field label="Program / challenge" htmlFor="account-program">
              <Input id="account-program" value={form.program} onChange={(e) => patch({ program: e.target.value })} placeholder="e.g. 2-Step Evaluation, Instant Funding" />
            </Field>
          ) : (
            <Field label="Account currency" htmlFor="account-currency">
              <Input id="account-currency" value={currentAccount.account_currency ?? "USD"} disabled />
            </Field>
          )}
        </div>

        {isPropFirm && (
          <>
            <Section title="Challenge structure">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Evaluation steps" htmlFor="evaluation-steps">
                  <Input id="evaluation-steps" type="number" min="0" max="5" value={form.evaluationSteps} onChange={(e) => patch({ evaluationSteps: e.target.value })} placeholder="0 = instant" />
                </Field>
                <Field label="Current phase" htmlFor="account-phase">
                  <Input id="account-phase" value={form.phase} onChange={(e) => patch({ phase: e.target.value })} placeholder="e.g. Phase 1, Funded" />
                </Field>
                <Field label="Profit target %" htmlFor="profit-target">
                  <Input id="profit-target" type="number" min="0" step="0.01" value={form.profitTarget} onChange={(e) => patch({ profitTarget: e.target.value })} suffix="%" />
                </Field>
                <Field label="Phase 2 target %" htmlFor="phase-two-target">
                  <Input id="phase-two-target" type="number" min="0" step="0.01" value={form.phaseTwoTarget} onChange={(e) => patch({ phaseTwoTarget: e.target.value })} suffix="%" />
                </Field>
              </div>
            </Section>

            <Section title="Prop firm risk rules">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Daily drawdown %" htmlFor="daily-loss">
                  <Input id="daily-loss" type="number" min="0" step="0.01" value={form.dailyLoss} onChange={(e) => patch({ dailyLoss: e.target.value })} suffix="%" />
                </Field>
                <Field label="Daily reset time (UTC)" htmlFor="daily-reset">
                  <Input id="daily-reset" type="time" value={form.dailyReset} onChange={(e) => patch({ dailyReset: e.target.value })} />
                </Field>
                <Field label="Maximum drawdown %" htmlFor="max-drawdown">
                  <Input id="max-drawdown" type="number" min="0" step="0.01" value={form.maxDrawdown} onChange={(e) => patch({ maxDrawdown: e.target.value })} suffix="%" />
                </Field>
                <Field label="Drawdown method" htmlFor="drawdown-method">
                  <select id="drawdown-method" className={inputClass} value={form.drawdownMethod} onChange={(e) => patch({ drawdownMethod: e.target.value })}>
                    <option value="">Not specified</option>
                    <option value="trailing">Trailing</option>
                    <option value="static">Static</option>
                    <option value="balance_based">Balance-based</option>
                    <option value="equity_based">Equity-based</option>
                  </select>
                </Field>
                <Field label="Floating loss limit %" htmlFor="floating-loss">
                  <Input id="floating-loss" type="number" min="0" step="0.01" value={form.floatingLoss} onChange={(e) => patch({ floatingLoss: e.target.value })} suffix="%" />
                </Field>
                <Field label="Maximum risk per trade %" htmlFor="risk-per-trade">
                  <Input id="risk-per-trade" type="number" min="0" step="0.01" value={form.riskPerTrade} onChange={(e) => patch({ riskPerTrade: e.target.value })} suffix="%" />
                </Field>
              </div>
            </Section>

            <Section title="Targets, consistency & payouts">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Minimum payout profit %" htmlFor="minimum-payout">
                  <Input id="minimum-payout" type="number" min="0" step="0.01" value={form.minPayout} onChange={(e) => patch({ minPayout: e.target.value })} suffix="%" />
                </Field>
                <Field label="Consistency limit %" htmlFor="consistency">
                  <Input id="consistency" type="number" min="0" step="0.01" value={form.consistency} onChange={(e) => patch({ consistency: e.target.value })} suffix="%" />
                </Field>
                <Field label="Trader profit share %" htmlFor="trader-split">
                  <Input id="trader-split" type="number" min="0" max="100" step="0.01" value={form.traderSplit} onChange={(e) => patch({ traderSplit: e.target.value })} suffix="%" />
                </Field>
                <Field label="Minimum trading days" htmlFor="min-trading-days">
                  <Input id="min-trading-days" type="number" min="0" step="1" value={form.minTradingDays} onChange={(e) => patch({ minTradingDays: e.target.value })} />
                </Field>
                <Field label="Withdrawal target %" htmlFor="withdrawal-target">
                  <Input id="withdrawal-target" type="number" min="0" step="0.01" value={form.withdrawalTarget} onChange={(e) => patch({ withdrawalTarget: e.target.value })} suffix="%" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-700">
                <input type="checkbox" checked={form.consistencyRequired} onChange={(e) => patch({ consistencyRequired: e.target.checked })} />
                Consistency rule applies to this account
              </label>
            </Section>
          </>
        )}

        {isPersonal && (
          <Section title="Personal risk plan">
            <p className="text-2xs text-ink-500">These are your own risk boundaries. They are separate from any prop firm rule set and do not replace the detailed Personal Trading Plan below.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Risk per trade %" htmlFor="personal-risk">
                <Input id="personal-risk" type="number" min="0" step="0.01" value={form.personalRisk} onChange={(e) => patch({ personalRisk: e.target.value })} suffix="%" />
              </Field>
              <Field label="Daily loss limit %" htmlFor="personal-daily-loss">
                <Input id="personal-daily-loss" type="number" min="0" step="0.01" value={form.personalDailyLoss} onChange={(e) => patch({ personalDailyLoss: e.target.value })} suffix="%" />
              </Field>
              <Field label="Maximum drawdown %" htmlFor="personal-max-drawdown">
                <Input id="personal-max-drawdown" type="number" min="0" step="0.01" value={form.personalMaxDrawdown} onChange={(e) => patch({ personalMaxDrawdown: e.target.value })} suffix="%" />
              </Field>
            </div>
          </Section>
        )}

        <Section title="Trading activity & execution">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Maximum trades per week" htmlFor="weekly-trades">
              <Input id="weekly-trades" type="number" min="0" step="1" value={form.maxWeeklyTrades} onChange={(e) => patch({ maxWeeklyTrades: e.target.value })} />
            </Field>
            <Field label="Maximum trades per day" htmlFor="daily-trades">
              <Input id="daily-trades" type="number" min="0" step="1" value={form.maxDailyTrades} onChange={(e) => patch({ maxDailyTrades: e.target.value })} />
            </Field>
            <Field label="Maximum trades per month" htmlFor="monthly-trades">
              <Input id="monthly-trades" type="number" min="0" step="1" value={form.maxMonthlyTrades} onChange={(e) => patch({ maxMonthlyTrades: e.target.value })} />
            </Field>
            <Field label="Allowed instruments" htmlFor="allowed-instruments" hint="Comma-separated, or leave blank for any instrument.">
              <Input id="allowed-instruments" value={form.allowedInstruments} onChange={(e) => patch({ allowedInstruments: e.target.value })} placeholder="EURUSD, XAUUSD" />
            </Field>
            <Field label="Minimum stop-loss (pips)" htmlFor="min-sl">
              <Input id="min-sl" type="number" min="0" step="0.1" value={form.minSl} onChange={(e) => patch({ minSl: e.target.value })} />
            </Field>
            <Field label="Maximum stop-loss (pips)" htmlFor="max-sl">
              <Input id="max-sl" type="number" min="0" step="0.1" value={form.maxSl} onChange={(e) => patch({ maxSl: e.target.value })} />
            </Field>
            <Field label="Minimum risk/reward" htmlFor="min-rr">
              <Input id="min-rr" type="number" min="0" step="0.1" value={form.minRr} onChange={(e) => patch({ minRr: e.target.value })} placeholder="e.g. 2" />
            </Field>
          </div>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input type="checkbox" checked={form.restrictNews} onChange={(e) => patch({ restrictNews: e.target.checked })} />
              No trading during high-impact news
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input type="checkbox" checked={form.noRiskIncrease} onChange={(e) => patch({ noRiskIncrease: e.target.checked })} />
              Do not increase risk after a loss
            </label>
          </div>
        </Section>

        {isPropFirm && (
          <Field label="Additional firm restrictions / notes" htmlFor="firm-restrictions">
            <Textarea id="firm-restrictions" rows={3} value={form.restrictions} onChange={(e) => patch({ restrictions: e.target.value })} placeholder="Add weekend holding, news, copy trading, consistency or payout conditions…" />
          </Field>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="max-w-md text-2xs text-ink-500">Enter the rules from your account agreement. ALLTRADES records and applies your configured limits; it does not verify a firm's current policy.</p>
          <Button onClick={onSave} loading={saving} disabled={!dirty} leftIcon={<Save className="h-3.5 w-3.5" />}>Save account rules</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-ink-700">{title}</h3>
      {children}
    </section>
  );
}
