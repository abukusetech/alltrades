import { Suspense } from "react";
import type { Metadata } from "next";
import { JournalClient } from "@/components/journal/JournalClient";
import { PageLoader } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Journal",
};

export default function JournalPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading journal" />}>
      <JournalClient />
    </Suspense>
  );
}
