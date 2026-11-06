"use client";

import * as React from "react";
import { Plus, Target, CheckCircle2, XCircle, AlertTriangle, Clock, PauseCircle, ChevronDown, Trash2, Pencil } from "lucide-react";
import { useCurrentAccount } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockLoader } from "@/components/ui/Spinner";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { listPlans, createPlan, updatePlan, deletePlan, listAllMilestones, createMilestone, toggleMilestone, deleteMilestone } from "@/lib/data/plans";
import { computeProgress, isOverdue, daysRemaining } from "@/lib/planning";
import type { Plan, PlanMilestone, PlanCategory, PlanPriority, PlanStatus } from "@/lib/types";
import { cn, formatDateMedium, formatNumber, parseNumberOrNull, toDateKey } from "@/lib/utils";

const CATEGORIES: PlanCategory[] = ["Trading", "Funded Accounts", "Financial", "Business", "Personal Development", "Other"];
const PRIORITIES: PlanPriority[] = ["High", "Medium", "Low"];

const STATUS_LABEL: Record<PlanStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  achieved: "Achieved",
  failed: "Failed",
  paused: "Paused",
};

const STATUS_TONE: Record<PlanStatus, "neutral" | "brand" | "profit" | "loss" | "warn"> = {
  not_started: "neutral",
  in_progress: "brand",
  achieved: "profit",
  failed: "loss",
  paused: "warn",
};

type SortMode = "priority" | "deadline" | "created";

export function PlanningClient() {
  const { currentAccount } = useCurrentAccount();
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [milestones, setMilestones] = React.useState<PlanMilestone[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Plan | null>(null);
  const [sortMode, setSortMode] = React.useState<SortMode>("priority");
  const [detail, setDetail] = React.useState<Plan | null>(null);

  const load = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const [p, m] = await Promise.all([listPlans(supabase, user.id), listAllMilestones(supabase, user.id)]);
      setPlans(p);
      setMilestones(m);
    } catch (err) {
      toast.error("Could not load goals", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  React.useEffect(() => { void load(); }, [load]);

  if (!currentAccount) {
    return (
      <div className="space-y-6">
        <PageHeader title="Planning" subtitle="Goals, milestones, and progress tracking." />
        <EmptyState title="No account selected" description="Create one in Settings." />
      </div>
    );
  }

  const active = plans.filter((p) => p.status === "not_started" || p.status === "in_progress");
  const achieved = plans.filter((p) => p.status === "achieved");
  const failed = plans.filter((p) => p.status === "failed");
  const paused = plans.filter((p) => p.status === "paused");
  const overdue = plans.filter((p) => isOverdue(p));

  const overallProgress = plans.length > 0
    ? Math.round(
        plans.reduce((sum, p) => {
          const ms = milestones.filter((m) => m.plan_id === p.id);
          return sum + computeProgress(p, ms);
        }, 0) / plans.length
      )
    : 0;

  const sorted = React.useMemo(() => {
    const list = [...active];
    if (sortMode === "priority") {
      const order = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortMode === "deadline") {
      list.sort((a, b) => (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31"));
    } else {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [active, sortMode]);

  async function handleStatus(plan: Plan, status: PlanStatus) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await updatePlan(supabase, user.id, plan.id, { status });
      toast.success(`Goal marked as ${STATUS_LABEL[status]}`);
      void load();
      setDetail(null);
    } catch (err) {
      toast.error("Update failed", err instanceof Error ? err.message : undefined);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await deletePlan(supabase, user.id, pendingDelete.id);
      toast.success("Goal deleted");
      setPendingDelete(null);
      void load();
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning"
        subtitle="Turn long-term ambitions into measurable actions."
        actions={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Goal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Stat label="Total goals" value={String(plans.length)} />
        <Stat label="Active" value={String(active.length)} tone="brand" />
        <Stat label="Achieved" value={String(achieved.length)} tone="profit" />
        <Stat label="Overdue" value={String(overdue.length)} tone={overdue.length > 0 ? "loss" : "neutral"} />
        <Stat label="Overall progress" value={`${overallProgress}%`} />
      </div>

      {loading ? (
        <BlockLoader label="Loading goals" />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<Target className="h-4 w-4" />}
          title="No goals yet"
          description="Create your first goal to track progress toward what matters."
          action={<Button onClick={() => { setEditing(null); setModalOpen(true); }}>Create First Goal</Button>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-900">Active Goals</h2>
                <Select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  options={[
                    { value: "priority", label: "Sort: Priority" },
                    { value: "deadline", label: "Sort: Deadline" },
                    { value: "created", label: "Sort: Created" },
                  ]}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((p) => (
                  <GoalCard
                    key={p.id}
                    plan={p}
                    milestones={milestones.filter((m) => m.plan_id === p.id)}
                    onOpen={() => setDetail(p)}
                  />
                ))}
              </div>
            </div>
          )}

          {achieved.length > 0 && (
            <Section title="Achieved" tone="profit" plans={achieved} milestones={milestones} onOpen={setDetail} />
          )}
          {paused.length > 0 && (
            <Section title="Paused" tone="warn" plans={paused} milestones={milestones} onOpen={setDetail} />
          )}
          {failed.length > 0 && (
            <Section title="Failed" tone="loss" plans={failed} milestones={milestones} onOpen={setDetail} />
          )}
        </>
      )}

      <GoalFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); void load(); }}
      />

      <GoalDetailModal
        plan={detail}
        milestones={milestones.filter((m) => detail && m.plan_id === detail.id)}
        onClose={() => setDetail(null)}
        onEdit={(p) => { setDetail(null); setEditing(p); setModalOpen(true); }}
        onDelete={(p) => { setDetail(null); setPendingDelete(p); }}
        onStatus={(s) => detail && handleStatus(detail, s)}
        onReload={load}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this goal?"
        description="Milestones and history will be removed too."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "brand" | "profit" | "loss" | "warn" }) {
  const toneClass = tone === "profit" ? "text-profit-text" : tone === "loss" ? "text-loss-text" : tone === "brand" ? "text-brand-700" : tone === "warn" ? "text-warn-text" : "text-ink-900";
  return (
    <Card>
      <CardBody className="p-4">
        <div className="eyebrow">{label}</div>
        <div className={cn("tabular mt-1 text-lg font-semibold", toneClass)}>{value}</div>
      </CardBody>
    </Card>
  );
}

function Section({ title, tone, plans, milestones, onOpen }: { title: string; tone: "profit" | "loss" | "warn"; plans: Plan[]; milestones: PlanMilestone[]; onOpen: (p: Plan) => void }) {
  const toneClass = tone === "profit" ? "text-profit-text" : tone === "loss" ? "text-loss-text" : "text-warn-text";
  return (
    <div>
      <h2 className={cn("mb-3 text-sm font-semibold", toneClass)}>{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <GoalCard key={p.id} plan={p} milestones={milestones.filter((m) => m.plan_id === p.id)} onOpen={() => onOpen(p)} />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ plan, milestones, onOpen }: { plan: Plan; milestones: PlanMilestone[]; onOpen: () => void }) {
  const progress = computeProgress(plan, milestones);
  const overdue = isOverdue(plan);
  const days = daysRemaining(plan.deadline);
  const nextMilestone = milestones.find((m) => !m.completed);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-lg border border-border bg-white p-4 shadow-card transition-colors hover:bg-surface-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink-900">{plan.title}</div>
          <div className="mt-0.5 text-3xs text-ink-500">{plan.category} · {plan.priority} priority</div>
        </div>
        <Badge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
      </div>

      {overdue && (
        <div className="mt-2 flex items-center gap-1.5 rounded border border-loss-border bg-loss-bg px-2 py-1 text-3xs text-loss-text">
          <AlertTriangle className="h-3 w-3" /> Overdue by {Math.abs(days ?? 0)} day{Math.abs(days ?? 0) === 1 ? "" : "s"}
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between text-3xs text-ink-500">
          <span>Progress</span>
          <span className="tabular font-semibold text-ink-900">{progress}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className={cn("h-full transition-all", plan.status === "achieved" ? "bg-profit" : overdue ? "bg-loss" : "bg-brand-600")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-2xs">
        {plan.deadline && (
          <div>
            <div className="text-3xs text-ink-500">Deadline</div>
            <div className="tabular text-xs text-ink-700">{formatDateMedium(new Date(plan.deadline + "T00:00:00"))}</div>
          </div>
        )}
        {plan.target_value != null && (
          <div>
            <div className="text-3xs text-ink-500">Target</div>
            <div className="tabular text-xs text-ink-700">{formatNumber(plan.target_value, 0)}</div>
          </div>
        )}
      </div>

      {nextMilestone && (
        <div className="mt-3 border-t border-border pt-2 text-3xs text-ink-500">
          <span className="text-ink-600">Next: </span>{nextMilestone.title}
        </div>
      )}
    </button>
  );
}

function GoalFormModal({ open, editing, onClose, onSaved }: { open: boolean; editing: Plan | null; onClose: () => void; onSaved: () => void }) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<PlanCategory>("Trading");
  const [priority, setPriority] = React.useState<PlanPriority>("Medium");
  const [startingValue, setStartingValue] = React.useState("");
  const [currentValue, setCurrentValue] = React.useState("");
  const [targetValue, setTargetValue] = React.useState("");
  const [startDate, setStartDate] = React.useState(toDateKey(new Date()));
  const [deadline, setDeadline] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [manualProgress, setManualProgress] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setCategory(editing.category);
      setPriority(editing.priority);
      setStartingValue(editing.starting_value != null ? String(editing.starting_value) : "");
      setCurrentValue(editing.current_value != null ? String(editing.current_value) : "");
      setTargetValue(editing.target_value != null ? String(editing.target_value) : "");
      setStartDate(editing.start_date);
      setDeadline(editing.deadline ?? "");
      setNotes(editing.notes ?? "");
      setManualProgress(editing.manual_progress != null ? String(editing.manual_progress) : "");
    } else {
      setTitle("");
      setDescription("");
      setCategory("Trading");
      setPriority("Medium");
      setStartingValue("");
      setCurrentValue("");
      setTargetValue("");
      setStartDate(toDateKey(new Date()));
      setDeadline("");
      setNotes("");
      setManualProgress("");
    }
  }, [open, editing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        priority,
        starting_value: parseNumberOrNull(startingValue),
        current_value: parseNumberOrNull(currentValue),
        target_value: parseNumberOrNull(targetValue),
        start_date: startDate,
        deadline: deadline || null,
        notes: notes.trim() || null,
        manual_progress: manualProgress ? Math.max(0, Math.min(100, Number(manualProgress))) : null,
      };

      if (editing) {
        await updatePlan(supabase, user.id, editing.id, payload);
        toast.success("Goal updated");
      } else {
        await createPlan(supabase, user.id, payload);
        toast.success("Goal created");
      }
      onSaved();
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Goal" : "New Goal"}
      size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={onSubmit} loading={saving}>{editing ? "Save changes" : "Create goal"}</Button></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Goal title" htmlFor="pf_title" required>
          <Input id="pf_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Secure a $50,000 funded account" />
        </Field>
        <Field label="Description" htmlFor="pf_desc">
          <Textarea id="pf_desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" htmlFor="pf_cat">
            <Select id="pf_cat" value={category} onChange={(e) => setCategory(e.target.value as PlanCategory)} options={CATEGORIES} />
          </Field>
          <Field label="Priority" htmlFor="pf_pri">
            <Select id="pf_pri" value={priority} onChange={(e) => setPriority(e.target.value as PlanPriority)} options={PRIORITIES} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Starting value" htmlFor="pf_startval">
            <Input id="pf_startval" type="number" step="any" value={startingValue} onChange={(e) => setStartingValue(e.target.value)} />
          </Field>
          <Field label="Current value" htmlFor="pf_curval">
            <Input id="pf_curval" type="number" step="any" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
          </Field>
          <Field label="Target value" htmlFor="pf_tgtval">
            <Input id="pf_tgtval" type="number" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date" htmlFor="pf_start" required>
            <Input id="pf_start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Deadline" htmlFor="pf_deadline">
            <Input id="pf_deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label="Manual progress % (optional override)" htmlFor="pf_man">
          <Input id="pf_man" type="number" min="0" max="100" value={manualProgress} onChange={(e) => setManualProgress(e.target.value)} suffix="%" />
        </Field>
        <Field label="Notes" htmlFor="pf_notes">
          <Textarea id="pf_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function GoalDetailModal({ plan, milestones, onClose, onEdit, onDelete, onStatus, onReload }: { plan: Plan | null; milestones: PlanMilestone[]; onClose: () => void; onEdit: (p: Plan) => void; onDelete: (p: Plan) => void; onStatus: (s: PlanStatus) => void; onReload: () => void }) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [newMilestone, setNewMilestone] = React.useState("");
  const [newMilestoneDate, setNewMilestoneDate] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  if (!plan) return null;
  const progress = computeProgress(plan, milestones);
  const days = daysRemaining(plan.deadline);
  const overdue = isOverdue(plan);

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await createMilestone(supabase, user.id, plan!.id, { title: newMilestone.trim(), due_date: newMilestoneDate || null });
      setNewMilestone("");
      setNewMilestoneDate("");
      onReload();
    } catch (err) {
      toast.error("Failed to add milestone", err instanceof Error ? err.message : undefined);
    } finally {
      setAdding(false);
    }
  }

  async function toggle(m: PlanMilestone) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await toggleMilestone(supabase, user.id, m.id, !m.completed);
      onReload();
    } catch (err) {
      toast.error("Failed", err instanceof Error ? err.message : undefined);
    }
  }

  async function removeMilestone(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await deleteMilestone(supabase, user.id, id);
      onReload();
    } catch (err) {
      toast.error("Failed", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={plan.title}
      description={`${plan.category} · ${plan.priority} priority`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onDelete(plan)} className="text-loss-text hover:bg-loss-bg" leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
          <Button variant="outline" onClick={() => onEdit(plan)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="space-y-5">
        {plan.description && <p className="text-2xs leading-relaxed text-ink-600">{plan.description}</p>}

        <div className="grid grid-cols-2 gap-3 rounded border border-border bg-surface-soft p-3 text-2xs sm:grid-cols-4">
          <Detail label="Progress" value={`${progress}%`} />
          <Detail label="Status" value={STATUS_LABEL[plan.status]} />
          {plan.deadline && <Detail label="Deadline" value={formatDateMedium(new Date(plan.deadline + "T00:00:00"))} />}
          {days !== null && <Detail label={days >= 0 ? "Days left" : "Overdue"} value={`${Math.abs(days)}d`} tone={overdue ? "loss" : days <= 7 ? "warn" : "neutral"} />}
        </div>

        {plan.status !== "achieved" && plan.status !== "failed" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => onStatus("in_progress")} leftIcon={<Clock className="h-3.5 w-3.5" />}>In Progress</Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("achieved")} className="text-profit-text hover:bg-profit-bg" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>Achieved</Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("paused")} className="text-warn-text hover:bg-warn-bg" leftIcon={<PauseCircle className="h-3.5 w-3.5" />}>Pause</Button>
            <Button size="sm" variant="ghost" onClick={() => onStatus("failed")} className="text-loss-text hover:bg-loss-bg" leftIcon={<XCircle className="h-3.5 w-3.5" />}>Failed</Button>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Milestones</h3>
            <span className="text-3xs text-ink-500">{milestones.filter((m) => m.completed).length} / {milestones.length}</span>
          </div>
          {milestones.length === 0 ? (
            <p className="text-3xs text-ink-500">No milestones yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded border border-border bg-surface-soft px-3 py-2 text-2xs">
                  <input type="checkbox" checked={m.completed} onChange={() => toggle(m)} className="h-3.5 w-3.5" />
                  <span className={cn("flex-1", m.completed ? "text-ink-400 line-through" : "text-ink-800")}>{m.title}</span>
                  {m.due_date && <span className="text-3xs text-ink-500">{m.due_date}</span>}
                  <button type="button" onClick={() => removeMilestone(m.id)} className="text-3xs text-loss-text hover:underline"><Trash2 className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addMilestone} className="mt-2 flex gap-2">
            <Input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="Add a milestone…" />
            <Input type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} className="w-36" />
            <Button type="submit" size="sm" loading={adding}>Add</Button>
          </form>
        </div>

        {plan.notes && <LongForm title="Notes" value={plan.notes} />}
      </div>
    </Modal>
  );
}

function Detail({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "loss" | "warn" }) {
  return (
    <div>
      <div className="text-3xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className={cn("tabular mt-0.5 text-xs font-semibold", tone === "loss" ? "text-loss-text" : tone === "warn" ? "text-warn-text" : "text-ink-900")}>{value}</div>
    </div>
  );
}

function LongForm({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-500">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink-700">{value}</p>
    </div>
  );
}
