import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { FactList } from "@/components/ui/fact-list";
import { MessageThread } from "@/components/ui/message-thread";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav } from "@/modules/admin";
import { getIncident, shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Incident" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminIncidentPage({ params }: PageProps) {
  const account = await requireAdmin();
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();
  const name = (author: string) =>
    author === "support" ? "Bid Market support" : author === "you" ? "You" : "Party";

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <AdminNav current="/admin/incidents" />
        <h1 className="font-mono text-2xl font-bold">{incident.refNo}</h1>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <FactList
              facts={[
                { label: "About", value: incident.reference ?? "" },
                { label: "Raised by", value: incident.raisedBy ?? "" },
                { label: "Against", value: incident.against ?? "No named party" },
                { label: "Raised", value: shortDateTime(incident.createdAt) },
                { label: "Problem", value: incident.description },
                { label: "Status", value: incident.status },
              ]}
            />
            {incident.decision ? <Banner>Decision: {incident.decision}</Banner> : null}
            <MessageThread
              messages={incident.messages.map((message) => ({
                id: message.id,
                author: name(message.author),
                body: message.body,
                sentAt: shortDateTime(message.createdAt),
              }))}
              composer={
                incident.status === "closed" ? null : (
                  <ActionForm
                    id="reply"
                    endpoint={`/api/v1/incidents/${incident.id}/messages`}
                    buttonLabel="Reply as support"
                    fields={[{ kind: "textarea", name: "body", label: "Message to both parties" }]}
                  />
                )
              }
            />
          </div>
          {incident.status === "closed" ? null : (
            <ActionPanel title="Record a decision">
              <ActionForm
                id="decide"
                endpoint={`/api/v1/admin/incidents/${incident.id}/decide`}
                buttonLabel="Save decision"
                fields={[
                  { kind: "textarea", name: "decision", label: "Decision, shown to both parties" },
                  { kind: "checkbox", name: "close", label: "Close the incident" },
                  { kind: "textarea", name: "reason", label: "Reason (saved in the audit log)" },
                ]}
              />
            </ActionPanel>
          )}
        </div>
      </main>
    </>
  );
}
