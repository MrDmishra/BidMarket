import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/notice-page";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <NoticePage
      title="Sign up"
      body="Registration is not open yet."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}
