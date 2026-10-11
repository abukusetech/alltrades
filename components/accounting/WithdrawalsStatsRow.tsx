"use client";

import * as React from "react";
import { SummaryCard } from "./SummaryCard";
import type { AccountingWithdrawal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function WithdrawalsStatsRow({
  withdrawals,
}: {
  withdrawals: AccountingWithdrawal[];
}) {
  const sum = (
    predicate: (w: AccountingWithdrawal) => boolean,
    field: "gross_requested" | "expected_net_payout" | "actual_net_received"
  ) =>
    withdrawals
      .filter(predicate)
      .reduce((s, w) => s + Number(w[field] ?? 0), 0);

  const requested = sum((w) => w.status === "requested" || w.status === "draft", "gross_requested");
  const approved = sum((w) => w.status === "approved", "expected_net_payout");
  const paid = sum((w) => w.status === "paid", "actual_net_received");
  const pending = sum((w) => w.status === "requested" || w.status === "approved", "expected_net_payout");
  const rejected = sum((w) => w.status === "rejected" || w.status === "cancelled", "gross_requested");

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <SummaryCard
        label="Requested"
        value={formatCurrency(requested)}
        tone={requested > 0 ? "brand" : "neutral"}
      />
      <SummaryCard
        label="Approved"
        value={formatCurrency(approved)}
        tone={approved > 0 ? "brand" : "neutral"}
      />
      <SummaryCard
        label="Pending net"
        value={formatCurrency(pending)}
        hint="Awaiting payment"
        tone={pending > 0 ? "warn" : "neutral"}
      />
      <SummaryCard
        label="Paid"
        value={formatCurrency(paid)}
        tone={paid > 0 ? "profit" : "neutral"}
      />
      <SummaryCard
        label="Rejected"
        value={formatCurrency(rejected)}
        tone={rejected > 0 ? "loss" : "neutral"}
      />
    </div>
  );
}
