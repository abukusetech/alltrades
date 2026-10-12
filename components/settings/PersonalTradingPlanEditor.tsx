"use client";

import * as React from "react";
import {
  Save,
  X,
  AlertTriangle,
  User,
  ChevronDown,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BlockLoader } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  getActivePersonalPlan,
  createPersonalPlan,
  updatePersonalPlan,
} from "@/lib/data/personal-plans";
import {
  defaultPlanFields,
  validatePlan,
  computePlanPreview,
} from "@/lib/accounts/personal-plan-helpers";
import { cn, formatCurrency } from "@/lib/utils";
import type { Account, PersonalTradingPlan } from "@/lib/types";
import {
  CapitalSection,
  RiskSection,
  TargetsSection,
  SlTpSection,
  SizingSection,
  StrategySection,
  ScheduleSection,
} from "./PersonalTradingPlan/sections";

const TABS = [
  { key: "capital", label: "Account" },
  { key: "risk", label: "Risk" },
  { key: "targets", label: "Targets" },
  { key: "sltp", label: "SL / TP" },
  { key: "sizing", label: "Sizing" },
  { key: "strategy", label: "Strategy" },
  { key: "schedule", label: "Schedule" },
] as const;

type TabKey = typeof TABS[number]["key"];

export function PersonalTradingPlanEditor({
  accounts,
}: {
  accounts: Account[];
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  // Personal accounts already come filtered by user from AppShell.
  // We don't need to fetch the user again — the accounts list is the source
  // of truth and is already scoped to the current session.
  const personalAccounts = React.useMemo(
    () => accounts.filter((a) => a.account_type === "PERSONAL"),
    [accounts]
  );

  const [accountId, setAccountId] = React.useState<string | null>(null);
  const account = React.useMemo(
    () => personalAccounts.find((a) => a.id === accountId) ?? null,
    [personalAccounts, accountId]
  );

  const [tab, setTab] = React.useState<TabKey>("capital");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [plan, setPlan] = React.useState<Partial<PersonalTradingPlan> | null>(null);
  const [original, setOriginal] = React.useState<Partial<PersonalTradingPlan> | null>(null);
  const [confirmBigChange, setConfirmBigChange] = React.useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = React.useState(false);

  // Initialize the selected account from the first personal account
  React.useEffect(() => {
    if (accountId) {
      // If the current selection is no longer valid, reset
      if (!personalAccounts.some((a) => a.id === accountId)) {
        setAccountId(personalAccounts[0]?.id ?? null);
      }
      return;
    }
    if (personalAccounts[0]) {
      setAccountId(personalAccounts[0].id);
    }
  }, [personalAccounts, accountId]);

  // Load plan when account changes
  React.useEffect(() => {
    if (!account) {
      setPlan(null);
      setOriginal(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPlan(null);
    setOriginal(null);

    (async () => {
      try {
        console.log("[ALLTRADES] loading personal plan for", account.id);
        const existing = await getActivePersonalPlan(supabase, account.id);
        console.log("[ALLTRADES] loaded existing plan", existing);
        if (cancelled) return;
        if (existing) {
          setPlan(existing);
          setOriginal(existing);
        } else {
          const initial = defaultPlanFields(account.account_currency || "USD");
          setPlan(initial);
          setOriginal(initial);
        }
      } catch (e) {
        console.error("[ALLTRADES] load failed", e);
        toast.error(
          "Could not load plan",
          e instanceof Error ? e.message : undefined
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account?.id, account?.account_currency, supabase, toast, account]);

  const dirty = React.useMemo(
    () => JSON.stringify(plan) !== JSON.stringify(original),
    [plan, original]
  );

  const issues = React.useMemo(
    () => (plan ? validatePlan(plan) : []),
    [plan]
  );
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const preview = React.useMemo(
    () =>
      plan && account
        ? computePlanPreview(plan, Number(account.starting_capital))
        : null,
    [plan, account]
  );

  function patch(p: Partial<PersonalTradingPlan>) {
    setPlan((prev) => (prev ? { ...prev, ...p } : prev));
  }

  function onCancel() {
    setPlan(original);
  }

  function isSubstantialRiskIncrease(): boolean {
    if (!plan || !original) return false;
    const oldDefault = Number(original.default_risk_percent ?? 0);
    const newDefault = Number(plan.default_risk_percent ?? 0);
    const oldDaily = Number(original.max_daily_loss_percent ?? 0);
    const newDaily = Number(plan.max_daily_loss_percent ?? 0);
    return (
      (newDefault > oldDefault * 1.5 && newDefault > 0.5) ||
      (newDaily > oldDaily * 1.5 && newDaily > 2)
    );
  }

  async function onSave() {
    if (!plan || !account) return;
    console.log("[ALLTRADES] save clicked", { accountId: account.id, plan });

    if (errors.length > 0) {
      toast.error(
        "Fix validation errors before saving",
        errors[0]?.message ?? undefined
      );
      return;
    }
    if (isSubstantialRiskIncrease()) {
      setConfirmBigChange(true);
      return;
    }
    await doSave();
  }

  async function doSave() {
    if (!plan || !account) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[ALLTRADES] save user", user?.id);
      if (!user) {
        toast.error("Not signed in");
        return;
      }

      const existing = await getActivePersonalPlan(supabase, account.id);
      console.log("[ALLTRADES] save check existing", existing);

      if (existing) {
        await updatePersonalPlan(supabase, existing.id, { is_active: false });

        const nextVersion = bumpVersion(existing.version_label);
        const created = await createPersonalPlan(supabase, user.id, account.id, {
          ...stripMeta(plan),
          version_label: nextVersion,
          effective_from: new Date().toISOString().slice(0, 10),
          is_active: true,
        });
        console.log("[ALLTRADES] created", created);
        setPlan(created);
        setOriginal(created);
      } else {
        const created = await createPersonalPlan(supabase, user.id, account.id, {
          ...stripMeta(plan),
          version_label: plan.version_label ?? "v1",
          effective_from:
            plan.effective_from ?? new Date().toISOString().slice(0, 10),
          is_active: true,
        });
        console.log("[ALLTRADES] created", created);
        setPlan(created);
        setOriginal(created);
      }
      toast.success("Personal Trading Plan saved");
    } catch (e) {
      console.error("[ALLTRADES] save failed", e);
      toast.error(
        "Could not save",
        e instanceof Error ? e.message : JSON.stringify(e)
      );
    } finally {
      setSaving(false);
      setConfirmBigChange(false);
    }
  }

  // ---- Empty state: no personal accounts ----
  if (personalAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-ink-400" />
            <CardTitle>My Personal Trading Plan</CardTitle>
          </div>
          <Badge tone="neutral">Not available</Badge>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-2xs text-ink-600">
            You don&apos;t have a personal trading account yet. Personal
            accounts are funded by your own capital and use the plan you
            configure here.
          </p>
          <p className="text-2xs text-ink-500">
            Create one in <strong>Create Account</strong> below, then classify
            it as <strong>Personal Capital</strong> in the classification card
            above.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (loading || !plan || !preview || !account) {
    return (
      <Card>
        <CardBody className="py-6">
          <BlockLoader label="Loading your plan" />
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <User className="h-4 w-4 text-profit-text" />
            <CardTitle>My Personal Trading Plan</CardTitle>
            <Badge tone="profit">{plan.version_label ?? "v1"}</Badge>
            {dirty && <Badge tone="warn">Unsaved changes</Badge>}
            {!dirty && <Badge tone="neutral">Saved</Badge>}
          </div>

          {personalAccounts.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountPickerOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded border border-border-strong bg-white px-2.5 py-1.5 text-2xs transition-colors hover:border-ink-400"
              >
                <span className="font-medium text-ink-900">{account.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
              </button>
              {accountPickerOpen && (
                <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-raised">
                  <ul className="py-1">
                    {personalAccounts.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountId(a.id);
                            setAccountPickerOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors",
                            a.id === accountId
                              ? "bg-brand-50 text-ink-900"
                              : "text-ink-700 hover:bg-surface-muted"
                          )}
                        >
                          <span className="truncate">{a.name}</span>
                          <span className="tabular text-3xs text-ink-500">
                            {formatCurrency(Number(a.starting_capital))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardBody className="space-y-5">
          <div className="rounded border border-profit-border bg-profit-bg px-3 py-2 text-2xs text-profit-text">
            These settings are yours alone. Never overwritten by Maven rules.
            Version history is preserved every time you save.
          </div>

          <div className="rounded border border-border bg-surface-soft p-3">
            <div className="text-3xs font-medium uppercase tracking-wide text-ink-500">
              Live preview ({formatCurrency(preview.accountCapital)} capital)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini label="Risk per trade" value={formatCurrency(preview.riskPerTradeAmount)} />
              <Mini label="Daily loss cap" value={formatCurrency(preview.dailyLossAmount)} />
              <Mini label="Weekly loss cap" value={formatCurrency(preview.weeklyLossAmount)} />
              <Mini label="Max drawdown" value={formatCurrency(preview.maxDrawdownAmount)} />
            </div>
          </div>

          <div className="border-b border-border">
            <nav className="flex flex-nowrap gap-1 overflow-x-auto" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors",
                    tab === t.key
                      ? "border-brand-600 font-medium text-ink-900"
                      : "border-transparent text-ink-500 hover:text-ink-800"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            {tab === "capital" && <CapitalSection plan={plan} patch={patch} />}
            {tab === "risk" && <RiskSection plan={plan} patch={patch} />}
            {tab === "targets" && <TargetsSection plan={plan} patch={patch} />}
            {tab === "sltp" && <SlTpSection plan={plan} patch={patch} />}
            {tab === "sizing" && <SizingSection plan={plan} patch={patch} />}
            {tab === "strategy" && <StrategySection plan={plan} patch={patch} />}
            {tab === "schedule" && <ScheduleSection plan={plan} patch={patch} />}
          </div>

          {errors.length > 0 && (
            <div className="space-y-1.5 rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {errors.length} error{errors.length === 1 ? "" : "s"}
              </div>
              {errors.map((i, k) => (
                <div key={k}>• {i.message}</div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="space-y-1.5 rounded border border-warn-border bg-warn-bg px-3 py-2 text-2xs text-warn-text">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {warnings.length} warning{warnings.length === 1 ? "" : "s"}
              </div>
              {warnings.map((i, k) => (
                <div key={k}>• {i.message}</div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-3xs text-ink-500">
              {dirty
                ? "You have unsaved changes."
                : plan.updated_at
                  ? `Last saved ${new Date(plan.updated_at).toLocaleString("en-GB")}`
                  : "Not yet saved."}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={!dirty || saving}
                leftIcon={<X className="h-3.5 w-3.5" />}
              >
                Cancel changes
              </Button>
              <Button
                onClick={onSave}
                loading={saving}
                disabled={!dirty}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save changes
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmBigChange}
        onClose={() => setConfirmBigChange(false)}
        onConfirm={doSave}
        title="Substantial risk increase"
        description="You're increasing your risk limits by more than 50%. Are you sure you want to save these changes?"
        confirmLabel="Save anyway"
        loading={saving}
      />
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="tabular mt-0.5 text-xs font-semibold text-ink-900">
        {value}
      </div>
    </div>
  );
}

function bumpVersion(v: string | undefined): string {
  if (!v) return "v2";
  const m = v.match(/^v(\d+)$/);
  if (!m) return `${v}.1`;
  return `v${Number(m[1]) + 1}`;
}

function stripMeta(
  plan: Partial<PersonalTradingPlan>
): Partial<PersonalTradingPlan> {
  const {
    id: _id,
    user_id: _uid,
    created_at: _created,
    updated_at: _updated,
    ...rest
  } = plan;
  void _id;
  void _uid;
  void _created;
  void _updated;
  return rest;
}
