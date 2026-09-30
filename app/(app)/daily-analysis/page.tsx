import type { Metadata } from "next";
import { DailyAnalysisClient } from "@/components/daily-analysis/DailyAnalysisClient";

export const metadata: Metadata = {
  title: "Daily Analysis",
};

export default function DailyAnalysisPage() {
  return <DailyAnalysisClient />;
}
