import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/notice-page";

export const metadata: Metadata = { title: "Buyer dashboard" };

export default function BuyerDashboardPage() {
  return (
    <NoticePage
      title="Buyer dashboard"
      body="The buyer dashboard is not available yet."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}
