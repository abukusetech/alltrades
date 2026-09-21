import type { Metadata } from "next";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function CalendarPage() {
  return <CalendarClient />;
}
