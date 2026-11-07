import type { PillTone } from "@/components/ui/status-pill";
import type { ThreadAuthor } from "@/modules/support/schemas";

export const SUPPORT_STATUS: Record<string, { label: string; tone: PillTone }> = {
  open: { label: "Open", tone: "warn" },
  decided: { label: "Decided", tone: "ok" },
  closed: { label: "Closed", tone: "neutral" },
  resolved: { label: "Resolved", tone: "ok" },
};

export const TICKET_TYPE_LABEL: Record<string, string> = {
  account: "Account and verification",
  payment: "Payments and invoices",
  tender: "Tenders and auctions",
  order: "Orders and delivery",
  technical: "Something is not working",
  other: "Something else",
};

export const AUTHOR_LABEL: Record<ThreadAuthor, string> = {
  you: "You",
  your_team: "Your team",
  other_party: "Other party",
  support: "Bid Market support",
};

export const shortDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
