import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { ActionPanel } from "@/components/ui/action-panel";
import { FactList } from "@/components/ui/fact-list";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav, getOrganisation } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Organisation" };

type PageProps = { params: Promise<{ id: string }> };

const REASON = {
  kind: "textarea",
  name: "reason",
  label: "Reason (saved in the audit log)",
} as const;

export default async function AdminOrganisationPage({ params }: PageProps) {
  const account = await requireAdmin();
  const { id } = await params;
  const organisation = await getOrganisation(id);
  if (!organisation) notFound();
  const endpoint = `/api/v1/admin/organisations/${id}`;
  const blocked =
    organisation.blockedUntil !== null && new Date(organisation.blockedUntil) > new Date();

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <AdminNav current="/admin/organisations" />
        <h1 className="text-3xl font-bold">{organisation.legalName}</h1>
        <p className="text-sm text-muted">Opening this page is recorded in the audit log.</p>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <FactList
              facts={[
                { label: "Type", value: `${organisation.kind}, ${organisation.entityType}` },
                { label: "Status", value: organisation.status.replace("_", " ") },
                { label: "GSTIN", value: organisation.gstin ?? "Not given", numeric: true },
                { label: "Strikes", value: String(organisation.strikeCount), numeric: true },
                {
                  label: "Blocked until",
                  value: blocked
                    ? organisation.blockedUntil === "infinity"
                      ? "Permanently"
                      : shortDateTime(organisation.blockedUntil ?? "")
                    : "Not blocked",
                },
                { label: "Users", value: organisation.users.map((user) => user.email).join(", ") },
                { label: "Joined", value: shortDateTime(organisation.createdAt) },
              ]}
            />
            <section aria-labelledby="penalties-heading" className="flex flex-col gap-3">
              <h2 id="penalties-heading" className="text-xl font-bold">
                Penalties
              </h2>
              {organisation.penalties.length === 0 ? <p className="text-muted">None.</p> : null}
              {organisation.penalties.map((penalty) => (
                <div
                  key={penalty.id}
                  className="flex flex-col gap-2 rounded-panel border border-line bg-surface p-4"
                >
                  <p>
                    <b>{penalty.strikeNo ? `Strike ${penalty.strikeNo}` : "Block by support"}</b>,{" "}
                    {penalty.days ? `${penalty.days} days` : "permanent"}. {penalty.reason}
                  </p>
                  {penalty.waivedAt ? (
                    <p className="text-sm text-muted">
                      Waived {shortDateTime(penalty.waivedAt)}: {penalty.waivedReason}
                    </p>
                  ) : (
                    <ActionForm
                      id={`waive-${penalty.id}`}
                      endpoint={`/api/v1/admin/penalties/${penalty.id}/waive`}
                      buttonLabel="Waive penalty"
                      variant="secondary"
                      fields={[REASON]}
                    />
                  )}
                </div>
              ))}
            </section>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {organisation.status === "active" ? (
              <ActionPanel title="Suspend">
                <ActionForm
                  id="suspend"
                  endpoint={`${endpoint}/suspend`}
                  buttonLabel="Suspend account"
                  variant="danger"
                  fields={[REASON]}
                  note="A suspended account cannot list, bid, order or pay."
                />
              </ActionPanel>
            ) : null}
            {organisation.status === "suspended" ? (
              <ActionPanel title="Reinstate">
                <ActionForm
                  id="reinstate"
                  endpoint={`${endpoint}/reinstate`}
                  buttonLabel="Reinstate account"
                  fields={[REASON]}
                />
              </ActionPanel>
            ) : null}
            <ActionPanel title="Block from tenders">
              <ActionForm
                id="block"
                endpoint={`${endpoint}/block`}
                buttonLabel="Apply block"
                variant="danger"
                numberFields={["days"]}
                fields={[
                  {
                    kind: "text",
                    name: "days",
                    label: "Days",
                    hint: "Leave empty to block permanently.",
                    inputMode: "numeric",
                  },
                  REASON,
                ]}
              />
            </ActionPanel>
            {blocked ? (
              <ActionPanel title="Lift block">
                <ActionForm
                  id="lift"
                  endpoint={`${endpoint}/lift-block`}
                  buttonLabel="Lift block"
                  fields={[REASON]}
                  note="This waives every penalty still running."
                />
              </ActionPanel>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
