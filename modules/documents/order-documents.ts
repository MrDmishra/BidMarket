import { formatPdfAmount, type PdfContent } from "@/modules/documents/pdf";

type OrderFacts = {
  orderNo: string;
  title: string;
  unit: string;
  quantity: number;
  unitPaise: number;
  totalPaise: number;
  paymentTerms: string;
  creditDays: number | null;
  expectedDeliveryOn: string | null;
  consigneeName: string | null;
  deliveryAddress: string | null;
  specs: { label: string; value: string; unit: string | null }[];
  events: { status: string; createdAt: string }[];
};
type PartyFacts = { legalName: string; gstin: string | null; address: string };
type Parties = { buyer: PartyFacts; seller: PartyFacts };

export const ORDER_DOCUMENT_KINDS = ["contract", "acceptance_report", "received_invoice"] as const;
export type OrderDocumentKind = (typeof ORDER_DOCUMENT_KINDS)[number];

const TERMS: Record<string, string> = {
  advance: "Advance",
  on_delivery: "On delivery",
  credit: "Credit",
};

const dateText = (value: string | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(
        new Date(value),
      )
    : "Not recorded";

const partyRows = (label: string, party: PartyFacts): [string, string][] => [
  [label, party.legalName],
  [`${label} GSTIN`, party.gstin ?? "Not provided"],
  [`${label} address`, party.address],
];

const goodsRows = (order: OrderFacts): [string, string][] => [
  ["Goods", order.title],
  ...order.specs.map((spec): [string, string] => [
    spec.label,
    [spec.value, spec.unit].filter(Boolean).join(" "),
  ]),
  ["Quantity", `${order.quantity} ${order.unit}`],
  ["Unit price", formatPdfAmount(order.unitPaise)],
  ["Order value", formatPdfAmount(order.totalPaise)],
];

const eventDate = (order: OrderFacts, status: string) =>
  order.events.find((event) => event.status === status)?.createdAt;

export function buildOrderDocument(
  kind: OrderDocumentKind,
  order: OrderFacts,
  parties: Parties,
): PdfContent {
  const delivery: [string, string][] = [
    ["Consignee", order.consigneeName ?? "Not provided"],
    ["Delivery address", order.deliveryAddress ?? "Not provided"],
  ];
  if (kind === "contract") {
    return {
      title: "Order contract",
      subtitle: `${order.orderNo}, accepted ${dateText(eventDate(order, "accepted"))}`,
      sections: [
        {
          heading: "Parties",
          rows: [...partyRows("Buyer", parties.buyer), ...partyRows("Seller", parties.seller)],
        },
        { heading: "Goods", rows: goodsRows(order) },
        {
          heading: "Terms",
          rows: [
            [
              "Payment terms",
              order.paymentTerms === "credit"
                ? `Credit, ${order.creditDays ?? 0} days`
                : (TERMS[order.paymentTerms] ?? order.paymentTerms),
            ],
            ["Expected delivery", dateText(order.expectedDeliveryOn ?? undefined)],
            ...delivery,
          ],
        },
      ],
      notes: [
        "The contract for these goods is between the buyer and the seller. Bid Market does not hold the goods or the goods payment.",
      ],
    };
  }
  const title = kind === "acceptance_report" ? "Acceptance report" : "Received invoice";
  return {
    title,
    subtitle: `${order.orderNo}, received ${dateText(eventDate(order, "completed"))}`,
    sections: [
      {
        heading: "Parties",
        rows: [...partyRows("Buyer", parties.buyer), ...partyRows("Seller", parties.seller)],
      },
      { heading: "Goods received", rows: goodsRows(order) },
      {
        heading: "Delivery",
        rows: [
          ...delivery,
          ["Dispatched", dateText(eventDate(order, "dispatched"))],
          ["Receipt confirmed", dateText(eventDate(order, "completed"))],
        ],
      },
    ],
    notes:
      kind === "acceptance_report"
        ? ["The buyer confirmed receipt of these goods with a delivery photo."]
        : [
            "This records the seller's invoice as received by the buyer. It is not a tax invoice from Bid Market.",
          ],
  };
}

type InvoiceFacts = {
  invoice_no: string;
  issued_at: string;
  snapshot: {
    supplierName: string;
    supplierGstin: string | null;
    customerName: string;
    customerGstin: string | null;
    customerAddress: string;
    customerStateCode: string;
    feePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    tdsPaise: number;
    totalPaise: number;
  };
};

export function buildInvoiceDocument(invoice: InvoiceFacts): PdfContent {
  const { snapshot } = invoice;
  const taxRows: [string, number][] = [
    ["Platform fee", snapshot.feePaise],
    ["CGST", snapshot.cgstPaise],
    ["SGST", snapshot.sgstPaise],
    ["IGST", snapshot.igstPaise],
    ["TDS deducted", snapshot.tdsPaise],
  ];
  return {
    title: "Tax invoice",
    subtitle: `${invoice.invoice_no}, ${dateText(invoice.issued_at)}`,
    sections: [
      {
        heading: "Parties",
        rows: [
          ["Supplier", snapshot.supplierName],
          ["Supplier GSTIN", snapshot.supplierGstin ?? "Not set"],
          ["Customer", snapshot.customerName],
          ["Customer GSTIN", snapshot.customerGstin ?? "Not provided"],
          ["Customer address", snapshot.customerAddress],
          ["Place of supply", `State code ${snapshot.customerStateCode}`],
        ],
      },
      {
        heading: "Amounts",
        rows: [
          ...taxRows
            .filter(([, paise]) => paise !== 0)
            .map(([label, paise]): [string, string] => [label, formatPdfAmount(paise)]),
          ["Total", formatPdfAmount(snapshot.totalPaise)],
        ],
      },
    ],
    notes: snapshot.supplierGstin
      ? []
      : ["Test record. Not a valid tax invoice until GST details are set."],
  };
}
