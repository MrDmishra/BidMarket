import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/notice-page";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <NoticePage
      title="Log in"
      body="Log in is not available yet."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}
