import { Suspense } from "react";
import type { Metadata } from "next";
import { TradeCheckClient } from "@/components/trade-check/TradeCheckClient";
import { PageLoader } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Trade Check",
};

export default function TradeCheckPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading Trade Check" />}>
      <TradeCheckClient />
    </Suspense>
  );
}
