import type { Metadata } from "next";
import { WithdrawalsClient } from "@/components/withdrawals/WithdrawalsClient";

export const metadata: Metadata = {
  title: "Withdrawals",
};

export default function WithdrawalsPage() {
  return <WithdrawalsClient />;
}
