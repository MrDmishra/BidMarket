import type { Metadata } from "next";
import { NoticePage } from "@/components/ui/notice-page";

export const metadata: Metadata = { title: "No access" };

export default function ForbiddenPage() {
  return (
    <NoticePage
      title="You do not have access to this page"
      body="Log in with an account that has permission, or return to home."
      action={{ href: "/", label: "Go to home" }}
    />
  );
}
