import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { getAccount } from "@/lib/auth/account";
import { OrganisationForm } from "@/modules/accounts/organisation-form";

export const metadata: Metadata = { title: "Set up your organisation" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (account.role === "admin") redirect("/admin");
  if (account.organisation) redirect(`/${account.organisation.kind}`);

  return (
    <main className="page-wrap flex flex-col items-center gap-6 py-10">
      <div className="flex items-center gap-3">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col gap-4 rounded-panel border border-line bg-surface p-6">
        <h1 className="text-3xl font-bold">Set up your organisation</h1>
        <OrganisationForm />
      </div>
    </main>
  );
}
