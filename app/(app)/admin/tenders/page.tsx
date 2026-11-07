import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { AdminNav, listTenders } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Tenders" };

const REASON = { kind: "text", name: "reason", label: "Reason (saved in the audit log)" } as const;
const FINISHED = ["ordered", "cancelled"];

export default async function AdminTendersPage() {
  const account = await requireAdmin();
  const rows = await listTenders();
  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <AdminNav current="/admin/tenders" />
        <h1 className="text-3xl font-bold">Tenders</h1>
        {rows.length === 0 ? <EmptyState message="No tenders yet." /> : null}
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const live =
              row.type !== "bid" &&
              (row.status === "auction" || row.status === "auction_scheduled");
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-mono">{row.tender_no}</b>
                  <StatusPill
                    tone={row.paused_at ? "bad" : FINISHED.includes(row.status) ? "neutral" : "ok"}
                    label={row.paused_at ? "Paused" : row.status.replace("_", " ")}
                  />
                </div>
                <p>
                  {row.title}, by {row.buyer}. {row.bid_count} bids. Closes{" "}
                  {shortDateTime(row.bid_ends_at)}.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {live && !row.paused_at ? (
                    <ActionForm
                      id={`pause-${row.id}`}
                      endpoint={`/api/v1/admin/tenders/${row.id}/pause`}
                      buttonLabel="Pause auction"
                      variant="secondary"
                      fields={[REASON]}
                      note="Use only during a platform problem. Bids stop until you resume."
                    />
                  ) : null}
                  {row.paused_at ? (
                    <ActionForm
                      id={`resume-${row.id}`}
                      endpoint={`/api/v1/admin/tenders/${row.id}/resume`}
                      buttonLabel="Resume auction"
                      fields={[REASON]}
                      note="The time lost is added back, with at least 5 minutes left."
                    />
                  ) : null}
                  {FINISHED.includes(row.status) ? null : (
                    <ActionForm
                      id={`cancel-${row.id}`}
                      endpoint={`/api/v1/admin/tenders/${row.id}/cancel`}
                      buttonLabel="Cancel tender"
                      variant="danger"
                      fields={[REASON]}
                      note="Fees held for this tender are released."
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
