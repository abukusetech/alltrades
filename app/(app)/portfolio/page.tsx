import type { Metadata } from "next";
import { PortfolioClient } from "@/components/portfolio/PortfolioClient";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
