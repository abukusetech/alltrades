import type { Plan, PlanMilestone } from "@/lib/types";

/**
 * Automatic progress for numeric goals:
 * Progress = (Current - Starting) / (Target - Starting) * 100
 * Clamped 0-100. Returns null if values missing or invalid.
 */
export function computeNumericProgress(plan: Plan): number | null {
  const { starting_value, current_value, target_value } = plan;
  if (
    starting_value === null ||
    current_value === null ||
    target_value === null ||
    !Number.isFinite(starting_value) ||
    !Number.isFinite(current_value) ||
    !Number.isFinite(target_value) ||
    starting_value === target_value
  ) {
    return null;
  }

  const raw = ((current_value - starting_value) / (target_value - starting_value)) * 100;
  if (!Number.isFinite(raw)) return null;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Automatic progress for milestone-based goals.
 */
export function computeMilestoneProgress(milestones: PlanMilestone[]): number | null {
  if (milestones.length === 0) return null;
  const completed = milestones.filter((m) => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

/**
 * Best available progress (milestones > numeric > manual).
 */
export function computeProgress(plan: Plan, milestones: PlanMilestone[]): number {
  if (plan.manual_progress !== null && plan.manual_progress !== undefined) {
    return Math.max(0, Math.min(100, plan.manual_progress));
  }
  const numeric = computeNumericProgress(plan);
  if (numeric !== null) return numeric;
  const m = computeMilestoneProgress(milestones);
  if (m !== null) return m;
  return plan.status === "achieved" ? 100 : 0;
}

/**
 * Days remaining in Africa/Nairobi timezone.
 * Positive = days left, negative = overdue.
 */
export function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;

  const nowEat = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  const deadlineEat = new Date(`${deadline}T23:59:59`);
  const diffMs = deadlineEat.getTime() - nowEat.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isOverdue(plan: Plan): boolean {
  if (plan.status === "achieved" || plan.status === "failed") return false;
  if (!plan.deadline) return false;
  const days = daysRemaining(plan.deadline);
  return days !== null && days < 0;
}
