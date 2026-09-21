import type { Metadata } from "next";
import { ConsistencyClient } from "@/components/consistency/ConsistencyClient";

export const metadata: Metadata = {
  title: "Consistency",
};

export default function ConsistencyPage() {
  return <ConsistencyClient />;
}
