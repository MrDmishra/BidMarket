import "server-only";

import type { AttentionItem } from "@/components/layout/dashboard-page";
import { shortDateTime } from "@/modules/support/labels";
import { listMyAttention } from "@/modules/support/service";

const HREF: Record<string, (id: string) => string> = {
  tender_fee: (id) => `/buyer/tenders/${id}`,
  tender_shortlist: (id) => `/buyer/tenders/${id}`,
  tender_award: (id) => `/buyer/tenders/${id}`,
  award_offer: (id) => `/seller/tenders/${id}`,
  order: (id) => `/seller/orders/${id}`,
  incident: (id) => `/support/incidents/${id}`,
};

/** The dashboard list of things waiting on the signed-in organisation. */
export async function attentionLinks(): Promise<AttentionItem[]> {
  const rows = await listMyAttention();
  return rows.flatMap((row) => {
    const href = HREF[row.kind];
    return href
      ? [
          {
            key: `${row.kind}:${row.id}`,
            label: row.label,
            href: href(row.id),
            due: row.due_at ? shortDateTime(row.due_at) : undefined,
          },
        ]
      : [];
  });
}
