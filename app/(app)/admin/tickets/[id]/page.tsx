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
import { getTicket, shortDateTime, TICKET_TYPE_LABEL } from "@/modules/support";

export const metadata: Metadata = { title: "Ticket" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminTicketPage({ params }: PageProps) {
  const account = await requireAdmin();
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <AdminNav current="/admin/tickets" />
        <h1 className="font-mono text-2xl font-bold">{ticket.refNo}</h1>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <FactList
              facts={[
                { label: "From", value: ticket.raisedBy ?? "" },
                { label: "Topic", value: TICKET_TYPE_LABEL[ticket.type] ?? ticket.type },
                ...(ticket.subcategory ? [{ label: "Subject", value: ticket.subcategory }] : []),
                { label: "Opened", value: shortDateTime(ticket.createdAt) },
                { label: "Question", value: ticket.description },
              ]}
            />
            {ticket.resolution ? <Banner>Resolved: {ticket.resolution}</Banner> : null}
            <MessageThread
              messages={ticket.messages.map((message) => ({
                id: message.id,
                author: message.author === "support" ? "Bid Market support" : "User",
                body: message.body,
                sentAt: shortDateTime(message.createdAt),
              }))}
              composer={
                <ActionForm
                  id="reply"
                  endpoint={`/api/v1/tickets/${ticket.id}/messages`}
                  buttonLabel="Reply"
                  fields={[{ kind: "textarea", name: "body", label: "Message to the user" }]}
                />
              }
            />
          </div>
          {ticket.status === "open" ? (
            <ActionPanel title="Resolve">
              <ActionForm
                id="resolve"
                endpoint={`/api/v1/admin/tickets/${ticket.id}/resolve`}
                buttonLabel="Mark resolved"
                fields={[
                  { kind: "textarea", name: "resolution", label: "Resolution, shown to the user" },
                  { kind: "textarea", name: "reason", label: "Reason (saved in the audit log)" },
                ]}
              />
            </ActionPanel>
          ) : null}
        </div>
      </main>
    </>
  );
}
