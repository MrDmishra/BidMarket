import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdminRole } from "@/lib/auth/account";
import { AdminSecurityForm } from "@/modules/accounts/admin-security-form";

export const metadata: Metadata = { title: "Two-step login" };

export default async function AdminSecurityPage() {
  const account = await requireAdminRole();
  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap py-8">
        <div className="mx-auto flex max-w-md flex-col gap-4 rounded-panel border border-line bg-surface p-6">
          <h1 className="text-3xl font-bold">Two-step login</h1>
          <AdminSecurityForm />
        </div>
      </main>
    </>
  );
}
