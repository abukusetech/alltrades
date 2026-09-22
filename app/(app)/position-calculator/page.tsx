import type { Metadata } from "next";
import { PositionCalculatorClient } from "@/components/position-calculator/PositionCalculatorClient";

export const metadata: Metadata = {
  title: "Position Calculator",
};

export default function PositionCalculatorPage() {
  return <PositionCalculatorClient />;
}
