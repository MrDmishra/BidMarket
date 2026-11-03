import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/notice-page";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <NoticePage
      title="Admin"
      body="The admin area is not available yet."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}
