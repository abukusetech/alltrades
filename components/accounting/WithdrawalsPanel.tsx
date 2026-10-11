"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Wallet,
  Split,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  deleteWithdrawalRecord,
  updateWithdrawalRecord,
  getAllocationForWithdrawal,
} from "@/lib/accounting/withdrawals";
import type {
  AccountingAllocation,
  AccountingWithdrawal,
  AccountingWithdrawalStatus,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<
  AccountingWithdrawalStatus,
  "neutral" | "brand" | "profit" | "loss" | "warn"
> = {
  draft: "neutral",
  requested: "brand",
  approved: "warn",
  paid: "profit",
  rejected: "loss",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<AccountingWithdrawalStatus, string> = {
  draft: "Draft",
  requested: "Requested",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export interface WithdrawalsPanelProps {
  withdrawals: AccountingWithdrawal[];
  onRefresh: () => void;
  onAdd: () => void;
  onEdit: (w: AccountingWithdrawal) => void;
  onMarkPaid: (w: AccountingWithdrawal) => void;
  onAllocate: (w: AccountingWithdrawal) => void;
}

export function WithdrawalsPanel({
  withdrawals,
  onRefresh,
  onAdd,
  onEdit,
  onMarkPaid,
  onAllocate,
}: WithdrawalsPanelProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [allocations, setAllocations] = React.useState<Map<string, AccountingAllocation>>(new Map());
  const [pendingDelete, setPendingDelete] = React.useState<AccountingWithdrawal | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Load existing allocations so we can hide the "Allocate" button on rows already allocated
  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const map = new Map<string, AccountingAllocation>();
      await Promise.all(
        withdrawals
          .filter((w) => w.status === "paid")
          .map(async (w) => {
            const a = await getAllocationForWithdrawal(supabase, user.id, w.id);
            if (a) map.set(w.id, a);
          })
      );
      setAllocations(map);
    })();
  }, [withdrawals, supabase]);

  async function changeStatus(w: AccountingWithdrawal, status: AccountingWithdrawalStatus) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await updateWithdrawalRecord(supabase, user.id, w.id, { status });
      toast.success(`Marked as ${STATUS_LABEL[status]}`);
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update status.";
      toast.error("Update failed", msg);
    }
  }

  async function onDeleteConfirm() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await deleteWithdrawalRecord(supabase, user.id, pendingDelete.id);
      toast.success("Withdrawal deleted");
      setPendingDelete(null);
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete.";
      toast.error("Delete failed", msg);
    } finally {
      setDeleting(false);
    }
  }

  if (withdrawals.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="h-4 w-4" />}
        title="No withdrawals yet"
        description="Record your first payout to track it from request to payment."
        action={<Button onClick={onAdd} leftIcon={<Plus className="h-3.5 w-3.5" />}>Record Withdrawal</Button>}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-2xs text-ink-600">
          {withdrawals.length} withdrawal{withdrawals.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={onAdd}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Record Withdrawal
          </Button>
        </div>
      </div>

      <TableWrap>
        <Table>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Firm</TH>
              <TH>Size</TH>
              <TH className="text-right">Gross</TH>
              <TH className="text-right">Split</TH>
              <TH className="text-right">Expected net</TH>
              <TH className="text-right">Actual net</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {withdrawals.map((w) => {
              const allocated = allocations.has(w.id);
              return (
                <TR key={w.id}>
                  <TD>{w.request_date}</TD>
                  <TD>{w.prop_firm}</TD>
                  <TD className="text-3xs text-ink-500">
                    {w.account_size ? `$${w.account_size.toLocaleString()}` : "—"}
                  </TD>
                  <TD className="tabular text-right">
                    {formatCurrency(Number(w.gross_requested))}
                  </TD>
                  <TD className="tabular text-right text-3xs text-ink-600">
                    {Number(w.trader_share_percent).toFixed(0)}/
                    {Number(w.firm_share_percent).toFixed(0)}
                  </TD>
                  <TD className="tabular text-right">
                    {w.expected_net_payout !== null
                      ? formatCurrency(Number(w.expected_net_payout))
                      : "—"}
                  </TD>
                  <TD
                    className={cn(
                      "tabular text-right font-semibold",
                      w.actual_net_received !== null && w.actual_net_received > 0
                        ? "text-profit-text"
                        : "text-ink-500"
                    )}
                  >
                    {w.actual_net_received !== null
                      ? formatCurrency(Number(w.actual_net_received))
                      : "—"}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</Badge>
                    {allocated && (
                      <Badge tone="brand" className="ml-1">
                        Allocated
                      </Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {w.status === "draft" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => changeStatus(w, "requested")}
                          leftIcon={<ArrowRight className="h-3 w-3" />}
                        >
                          Submit
                        </Button>
                      )}
                      {w.status === "requested" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => changeStatus(w, "approved")}
                          leftIcon={<CheckCircle2 className="h-3 w-3" />}
                        >
                          Approve
                        </Button>
                      )}
                      {w.status === "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onMarkPaid(w)}
                          leftIcon={<CheckCircle2 className="h-3 w-3" />}
                        >
                          Mark paid
                        </Button>
                      )}
                      {w.status === "paid" && !allocated && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAllocate(w)}
                          leftIcon={<Split className="h-3 w-3" />}
                        >
                          Allocate
                        </Button>
                      )}
                      {w.status !== "paid" && w.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => changeStatus(w, "rejected")}
                          className="text-loss-text hover:bg-loss-bg"
                          leftIcon={<XCircle className="h-3 w-3" />}
                        >
                          Reject
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(w)}
                        leftIcon={<Pencil className="h-3 w-3" />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(w)}
                        className="text-loss-text hover:bg-loss-bg"
                        leftIcon={<Trash2 className="h-3 w-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableWrap>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={onDeleteConfirm}
        title="Delete withdrawal?"
        description="If this withdrawal has already been paid and allocated, deleting it will break the ledger. Reverse the allocation first."
        confirmLabel="Delete withdrawal"
        destructive
        loading={deleting}
      />
    </>
  );
}
