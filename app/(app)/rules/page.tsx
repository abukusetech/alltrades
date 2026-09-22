import type { Metadata } from "next";
import { RulesClient } from "@/components/rules/RulesClient";

export const metadata: Metadata = {
  title: "Rules",
};

export default function RulesPage() {
  return <RulesClient />;
}
