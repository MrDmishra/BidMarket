import type { PillTone } from "@/components/ui/status-pill";

export const TENDER_STATUS: Record<string, { label: string; tone: PillTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  unpaid: { label: "Fee due", tone: "warn" },
  bidding: { label: "Open for bids", tone: "ok" },
  auction_scheduled: { label: "Auction scheduled", tone: "ok" },
  auction: { label: "Auction live", tone: "warn" },
  shortlisting: { label: "Shortlist sellers", tone: "warn" },
  evaluating: { label: "Choose a seller", tone: "warn" },
  awarding: { label: "Awaiting seller", tone: "warn" },
  ordered: { label: "Ordered", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const closingText = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
