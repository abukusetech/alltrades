import type { Metadata } from "next";
import { PlanningClient } from "@/components/planning/PlanningClient";

export const metadata: Metadata = {
  title: "Planning",
};

export default function PlanningPage() {
  return <PlanningClient />;
}
