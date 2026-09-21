import type { Metadata } from "next";
import { AnalysisClient } from "@/components/analysis/AnalysisClient";

export const metadata: Metadata = {
  title: "Analysis",
};

export default function AnalysisPage() {
  return <AnalysisClient />;
}
