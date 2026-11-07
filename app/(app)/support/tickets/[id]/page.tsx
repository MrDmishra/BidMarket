import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { Banner } from "@/components/ui/banner";
import { FactList } from "@/components/ui/fact-list";
import { MessageThread } from "@/components/ui/message-thread";
import { StatusPill } from "@/components/ui/status-pill";
import { requireMember } from "@/lib/auth/account";
import {
  AUTHOR_LABEL,
  getTicket,
  shortDateTime,
  SUPPORT_STATUS,
  TICKET_TYPE_LABEL,
} from "@/modules/support";

export const metadata: Metadata = { title: "Ticket" };

type TicketPageProps = { params: Promise<{ id: string }> };

export default async function TicketPage({ params }: TicketPageProps) {
  const { organisation } = await requireMember();
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex max-w-3xl flex-col gap-5 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{ticket.refNo}</h1>
          <StatusPill {...(SUPPORT_STATUS[ticket.status] ?? SUPPORT_STATUS.open!)} />
        </div>
        <FactList
          facts={[
            { label: "Topic", value: TICKET_TYPE_LABEL[ticket.type] ?? ticket.type },
            ...(ticket.subcategory ? [{ label: "Subject", value: ticket.subcategory }] : []),
            { label: "Opened", value: shortDateTime(ticket.createdAt) },
            { label: "Question", value: ticket.description },
          ]}
        />
        {ticket.resolution ? (
          <Banner>
            <b>Resolved:</b> {ticket.resolution}. Reply below if you still need help.
          </Banner>
        ) : null}
        <MessageThread
          messages={ticket.messages.map((message) => ({
            id: message.id,
            author: AUTHOR_LABEL[message.author],
            body: message.body,
            sentAt: shortDateTime(message.createdAt),
          }))}
          composer={
            <ActionForm
              id="reply"
              endpoint={`/api/v1/tickets/${ticket.id}/messages`}
              buttonLabel="Send"
              fields={[{ kind: "textarea", name: "body", label: "Your message" }]}
            />
          }
        />
      </main>
    </>
  );
}
