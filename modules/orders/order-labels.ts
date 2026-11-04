import type { PillTone } from "@/components/ui/status-pill";
import type { OrderStatus } from "@/lib/supabase/domain-types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: PillTone }> = {
  unpaid: { label: "Fee due", tone: "warn" },
  awaiting_seller: { label: "Awaiting seller", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" },
  dispatched: { label: "Dispatched", tone: "ok" },
  completed: { label: "Completed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const ORDER_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "unpaid", label: "Placed" },
  { status: "awaiting_seller", label: "Fee paid" },
  { status: "accepted", label: "Accepted" },
  { status: "dispatched", label: "Dispatched" },
  { status: "completed", label: "Received" },
];

export const DOCUMENT_LABELS: Record<string, string> = {
  product_bill: "Product bill",
  eway_bill: "E-way bill",
  transport_bill: "Transport bill",
  delivery_proof: "Delivery photo",
};

export const PAYMENT_TERM_LABELS: Record<string, string> = {
  advance: "Advance",
  on_delivery: "On delivery",
  credit: "Credit",
};
