import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { listPendingOrganisations } from "@/modules/accounts";
import { ReviewActions } from "@/modules/accounts/review-queue";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const account = await requireAdmin();
  const pending = await listPendingOrganisations();

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Account verification</h1>
        {pending.length === 0 ? <EmptyState message="No accounts are waiting for review." /> : null}
        {pending.map((organisation) => (
          <section
            key={organisation.id}
            aria-label={organisation.legal_name}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{organisation.legal_name}</h2>
              <StatusPill tone="warn" label="Pending" />
            </div>
            <FactList
              facts={[
                { label: "Type", value: `${organisation.kind}, ${organisation.entity_type}` },
                {
                  label: "PAN ending",
                  value: organisation.pan_last4 ?? "Not saved",
                  numeric: true,
                },
                { label: "GSTIN", value: organisation.gstin ?? "Not given", numeric: true },
              ]}
            />
            <ReviewActions organisationId={organisation.id} />
          </section>
        ))}
      </main>
    </>
  );
}
