import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { ActionPanel } from "@/components/ui/action-panel";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireMember } from "@/lib/auth/account";
import {
  listMyIncidents,
  listMyTickets,
  shortDateTime,
  SUPPORT_STATUS,
  TICKET_TYPE_LABEL,
  TICKET_TYPES,
} from "@/modules/support";

export const metadata: Metadata = { title: "Support" };

type SupportPageProps = {
  searchParams: Promise<{ orderId?: string; tenderId?: string; productId?: string; ref?: string }>;
};

const UUID = /^[0-9a-f-]{36}$/i;

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const { organisation } = await requireMember();
  const query = await searchParams;
  const [incidents, tickets] = await Promise.all([listMyIncidents(), listMyTickets()]);
  const reference = Object.fromEntries(
    (["orderId", "tenderId", "productId"] as const)
      .filter((key) => UUID.test(query[key] ?? ""))
      .map((key) => [key, query[key]]),
  );
  const hasReference = Object.keys(reference).length === 1;

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-6 py-8">
        <h1 className="text-3xl font-bold">Support</h1>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="incidents-heading" className="flex flex-col gap-3">
              <h2 id="incidents-heading" className="text-xl font-bold">
                Incidents
              </h2>
              <p className="text-sm text-muted">
                Problems with an order, tender or product. Both sides and Bid Market support can see
                the thread.
              </p>
              <DataTable
                caption="Your incidents"
                rows={incidents}
                rowKey={(row) => row.id}
                empty={
                  <EmptyState message="No incidents. Raise one from the order, tender or product page." />
                }
                columns={[
                  {
                    key: "ref",
                    header: "Reference",
                    render: (row) => (
                      <Link className="font-mono underline" href={`/support/incidents/${row.id}`}>
                        {row.ref_no}
                      </Link>
                    ),
                  },
                  { key: "about", header: "About", render: (row) => row.reference ?? "" },
                  {
                    key: "side",
                    header: "Raised by",
                    render: (row) => (row.raised_by_me ? "You" : "Other party"),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => (
                      <StatusPill {...(SUPPORT_STATUS[row.status] ?? SUPPORT_STATUS.open!)} />
                    ),
                  },
                ]}
              />
            </section>
            <section aria-labelledby="tickets-heading" className="flex flex-col gap-3">
              <h2 id="tickets-heading" className="text-xl font-bold">
                Tickets
              </h2>
              <DataTable
                caption="Your tickets"
                rows={tickets}
                rowKey={(row) => row.id}
                empty={<EmptyState message="No tickets yet." />}
                columns={[
                  {
                    key: "ref",
                    header: "Reference",
                    render: (row) => (
                      <Link className="font-mono underline" href={`/support/tickets/${row.id}`}>
                        {row.ref_no}
                      </Link>
                    ),
                  },
                  {
                    key: "type",
                    header: "Topic",
                    render: (row) => TICKET_TYPE_LABEL[row.type] ?? row.type,
                  },
                  { key: "date", header: "Opened", render: (row) => shortDateTime(row.created_at) },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => (
                      <StatusPill {...(SUPPORT_STATUS[row.status] ?? SUPPORT_STATUS.open!)} />
                    ),
                  },
                ]}
              />
            </section>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {hasReference ? (
              <ActionPanel title={`Report a problem${query.ref ? ` with ${query.ref}` : ""}`}>
                <ActionForm
                  id="incident"
                  endpoint="/api/v1/incidents"
                  body={reference}
                  buttonLabel="Raise incident"
                  fields={[{ kind: "textarea", name: "description", label: "What went wrong?" }]}
                  note="The other side is told, but never sees your name."
                  redirectTo={(data) => {
                    const id = (data as { incidentId?: string } | null)?.incidentId;
                    return id ? `/support/incidents/${id}` : null;
                  }}
                />
              </ActionPanel>
            ) : null}
            <ActionPanel title="Ask Bid Market">
              <ActionForm
                id="ticket"
                endpoint="/api/v1/tickets"
                buttonLabel="Send to support"
                fields={[
                  {
                    kind: "select",
                    name: "type",
                    label: "Topic",
                    options: TICKET_TYPES.map((type) => ({
                      value: type,
                      label: TICKET_TYPE_LABEL[type] ?? type,
                    })),
                  },
                  { kind: "text", name: "subcategory", label: "Subject (optional)" },
                  { kind: "textarea", name: "description", label: "How can we help?" },
                ]}
                redirectTo={(data) => {
                  const id = (data as { ticketId?: string } | null)?.ticketId;
                  return id ? `/support/tickets/${id}` : null;
                }}
              />
            </ActionPanel>
          </div>
        </div>
      </main>
    </>
  );
}
