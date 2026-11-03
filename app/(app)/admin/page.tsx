import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { NoticePage } from "@/components/ui/notice-page";
import { requireAdmin } from "@/lib/auth/account";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const account = await requireAdmin();
  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <NoticePage title="Admin" body="Verification queues open in the next step." />
    </>
  );
}
