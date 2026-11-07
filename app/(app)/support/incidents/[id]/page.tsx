import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { Banner } from "@/components/ui/banner";
import { FactList } from "@/components/ui/fact-list";
import { MessageThread } from "@/components/ui/message-thread";
import { StatusPill } from "@/components/ui/status-pill";
import { requireMember } from "@/lib/auth/account";
import { AUTHOR_LABEL, getIncident, shortDateTime, SUPPORT_STATUS } from "@/modules/support";

export const metadata: Metadata = { title: "Incident" };

type IncidentPageProps = { params: Promise<{ id: string }> };

export default async function IncidentPage({ params }: IncidentPageProps) {
  const { organisation } = await requireMember();
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex max-w-3xl flex-col gap-5 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{incident.refNo}</h1>
          <StatusPill {...(SUPPORT_STATUS[incident.status] ?? SUPPORT_STATUS.open!)} />
        </div>
        <FactList
          facts={[
            { label: "About", value: incident.reference ?? "" },
            { label: "Raised", value: shortDateTime(incident.createdAt) },
            { label: "Raised by", value: incident.role === "raiser" ? "You" : "The other party" },
            { label: "Problem", value: incident.description },
          ]}
        />
        {incident.decision ? (
          <Banner>
            <b>Decision by Bid Market:</b> {incident.decision}
          </Banner>
        ) : null}
        <MessageThread
          messages={incident.messages.map((message) => ({
            id: message.id,
            author: AUTHOR_LABEL[message.author],
            body: message.body,
            sentAt: shortDateTime(message.createdAt),
          }))}
          composer={
            incident.status === "closed" ? (
              <p className="text-muted">This incident is closed.</p>
            ) : (
              <ActionForm
                id="reply"
                endpoint={`/api/v1/incidents/${incident.id}/messages`}
                buttonLabel="Send"
                fields={[{ kind: "textarea", name: "body", label: "Your message" }]}
              />
            )
          }
        />
      </main>
    </>
  );
}
