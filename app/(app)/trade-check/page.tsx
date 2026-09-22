import type { Metadata } from "next";
import { TradeCheckClient } from "@/components/trade-check/TradeCheckClient";

export const metadata: Metadata = {
  title: "Trade Check",
};

export default function TradeCheckPage() {
  return <TradeCheckClient />;
}
