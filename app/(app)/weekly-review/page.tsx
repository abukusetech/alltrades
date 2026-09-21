import type { Metadata } from "next";
import { WeeklyReviewClient } from "@/components/weekly-review/WeeklyReviewClient";

export const metadata: Metadata = {
  title: "Weekly Review",
};

export default function WeeklyReviewPage() {
  return <WeeklyReviewClient />;
}
