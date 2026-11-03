import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/notice-page";

export const metadata: Metadata = { title: "Seller dashboard" };

export default function SellerDashboardPage() {
  return (
    <NoticePage
      title="Seller dashboard"
      body="The seller dashboard is not available yet."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}
