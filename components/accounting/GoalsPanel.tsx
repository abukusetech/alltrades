"use client";

import * as React from "react";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { deleteGoal, listGoals } from "@/lib/accounting/data";
import type { AccountingGoal, FundBalance } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { GoalFormModal } from "./GoalFormModal";

const PRIORITY_LABEL: Record<number, string> = {
  1: "High",
  2: "Normal",
  3: "Low",
};

export function GoalsPanel({ balances }: { balances: FundBalance[] }) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [goals, setGoals] = React.useState<AccountingGoal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountingGoal | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<AccountingGoal | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const rows = await listGoals(supabase, user.id);
      setGoals(rows);
    } catch (err) {
      toast.error("Could not load goals", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await deleteGoal(supabase, user.id, pendingDelete.id);
      toast.success("Goal deleted");
      setPendingDelete(null);
      void load();
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  function fundBalance(key: string): number {
    return balances.find((b) => b.fund_key === key)?.balance ?? 0;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xs text-ink-600">
          {goals.length} goal{goals.length === 1 ? "" : "s"}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          New Goal
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-2xs text-ink-500">Loading…</div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-4 w-4" />}
          title="No savings goals yet"
          description="Create a goal to track progress toward the next account, an emergency reserve, or a personal milestone."
          action={
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              Create first goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const saved = fundBalance(g.linked_fund_key);
            const remaining = Math.max(Number(g.target_amount_usd) - saved, 0);
            const percent =
              Number(g.target_amount_usd) > 0
                ? Math.min(100, (saved / Number(g.target_amount_usd)) * 100)
                : 0;
            return (
              <Card key={g.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{g.name}</CardTitle>
                    <div className="mt-1 text-3xs text-ink-500">
                      Priority: {PRIORITY_LABEL[g.priority] ?? "Normal"}
                    </div>
                  </div>
                  <Badge tone={percent >= 100 ? "profit" : "brand"}>
                    {formatPercent(percent, 0)}
                  </Badge>
                </CardHeader>
                <CardBody className="space-y-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={percent >= 100 ? "h-full bg-profit" : "h-full bg-brand-600"}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-2xs">
                    <div>
                      <div className="text-3xs text-ink-500">Saved</div>
                      <div className="tabular font-semibold text-ink-900">
                        {formatCurrency(saved)}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xs text-ink-500">Target</div>
                      <div className="tabular font-semibold text-ink-900">
                        {formatCurrency(Number(g.target_amount_usd))}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xs text-ink-500">Remaining</div>
                      <div className="tabular font-semibold text-ink-700">
                        {formatCurrency(remaining)}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xs text-ink-500">Linked fund</div>
                      <div className="truncate text-ink-700">
                        {g.linked_fund_key.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                  {g.target_date && (
                    <div className="text-3xs text-ink-500">
                      Target date: {g.target_date}
                    </div>
                  )}
                  <div className="flex items-center gap-1 border-t border-border pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(g);
                        setFormOpen(true);
                      }}
                      leftIcon={<Pencil className="h-3 w-3" />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(g)}
                      className="text-loss-text hover:bg-loss-bg"
                      leftIcon={<Trash2 className="h-3 w-3" />}
                    >
                      Delete
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <GoalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
        editing={editing}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={onDelete}
        title="Delete this goal?"
        description="The goal will be removed. Your saved funds stay untouched."
        confirmLabel="Delete goal"
        destructive
        loading={deleting}
      />
    </div>
  );
}
