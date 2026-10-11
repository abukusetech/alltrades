import type { Metadata } from "next";
import { AccountingClient } from "@/components/accounting/AccountingClient";

export const metadata: Metadata = {
  title: "Accounting",
};

export default function AccountingPage() {
  return <AccountingClient />;
}
