import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { WithdrawalsClient } from "@/components/withdrawals/WithdrawalsClient";
import { PageLoader } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Withdrawals",
};

export default function WithdrawalsPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading withdrawals" />}>
      <div className="space-y-6">
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-2xs text-brand-800">
          Looking for full profit tracking, allocation, and business finances?{" "}
          <Link href="/accounting" className="font-medium underline">
            Open Accounting
          </Link>{" "}
          — record payouts through payment, split them into funds, and track account purchases.
        </div>
        <WithdrawalsClient />
      </div>
    </Suspense>
  );
}
