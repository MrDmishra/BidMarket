import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { MoneySummary } from "@/components/ui/money-summary";
import { StatusPill } from "@/components/ui/status-pill";
import { Stepper } from "@/components/ui/stepper";
import { stateName } from "@/lib/india/states";
import { formatInr } from "@/lib/money";
import { PayButton } from "@/modules/billing/pay-button";
import { DispatchForm } from "@/modules/orders/dispatch-form";
import { AcceptOrder, OrderDecision } from "@/modules/orders/order-actions";
import {
  DOCUMENT_LABELS,
  ORDER_STATUS,
  ORDER_STEPS,
  PAYMENT_TERM_LABELS,
} from "@/modules/orders/order-labels";
import { ReceiveForm } from "@/modules/orders/receive-form";
import type { OrderContacts, OrderDetail } from "@/modules/orders/schemas";

const dateText = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(
    new Date(value),
  );

function steps(order: OrderDetail) {
  return ORDER_STEPS.map((step) => {
    const event = order.events.find((item) => item.status === step.status);
    return {
      label: step.label,
      date: event ? dateText(event.createdAt) : undefined,
      done: Boolean(event),
    };
  });
}

function PaymentPanel({
  order,
  paymentsEnabled,
}: {
  order: OrderDetail;
  paymentsEnabled: boolean;
}) {
  if (order.charge?.status !== "pending") return null;
  return (
    <ActionPanel title="Platform fee">
      <MoneySummary
        valuePaise={order.totalPaise}
        feePaise={order.charge.feePaise}
        gstPaise={order.charge.gstPaise}
      />
      {paymentsEnabled ? (
        <PayButton chargeId={order.charge.id} label={`Pay ${formatInr(order.charge.totalPaise)}`} />
      ) : (
        <Banner>Online payment is not switched on yet. Try again later.</Banner>
      )}
    </ActionPanel>
  );
}

function ActionPanels({
  order,
  paymentsEnabled,
}: {
  order: OrderDetail;
  paymentsEnabled: boolean;
}) {
  const seller = order.side === "seller";
  const buyer = order.side === "buyer";
  return (
    <>
      <PaymentPanel order={order} paymentsEnabled={paymentsEnabled} />
      {seller && order.status === "awaiting_seller" ? (
        <ActionPanel title="Your decision">
          {order.charge ? null : <AcceptOrder orderId={order.id} />}
          <OrderDecision
            orderId={order.id}
            action="reject"
            buttonLabel="Reject order"
            reasonLabel="Reason for rejecting"
          />
        </ActionPanel>
      ) : null}
      {seller && order.status === "accepted" ? (
        <ActionPanel title="Dispatch">
          <DispatchForm orderId={order.id} />
        </ActionPanel>
      ) : null}
      {buyer && (order.status === "unpaid" || order.status === "awaiting_seller") ? (
        <ActionPanel title="Change of plan">
          <OrderDecision
            orderId={order.id}
            action="cancel"
            buttonLabel="Cancel order"
            reasonLabel="Reason for cancelling"
          />
        </ActionPanel>
      ) : null}
      {buyer && order.status === "dispatched" ? (
        <ActionPanel title="Confirm receipt">
          <ReceiveForm orderId={order.id} />
        </ActionPanel>
      ) : null}
    </>
  );
}

type OrderDetailViewProps = {
  order: OrderDetail;
  contacts: OrderContacts | null;
  organisationName: string;
  paymentsEnabled: boolean;
};

export function OrderDetailView({
  order,
  contacts,
  organisationName,
  paymentsEnabled,
}: OrderDetailViewProps) {
  const cancelled = order.events.find((event) => event.status === "cancelled");
  const pdfLinks = [
    ...(order.contactsUnlocked ? [{ kind: "contract", label: "Contract" }] : []),
    ...(order.status === "completed"
      ? [
          { kind: "acceptance_report", label: "Acceptance report" },
          { kind: "received_invoice", label: "Received invoice" },
        ]
      : []),
  ];

  return (
    <>
      <AppHeader name={organisationName} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{order.orderNo}</h1>
          <StatusPill {...ORDER_STATUS[order.status]} />
          <Link
            className="ml-auto text-sm underline"
            href={`/support?orderId=${order.id}&ref=${encodeURIComponent(order.orderNo)}`}
          >
            Report a problem
          </Link>
        </div>
        {cancelled ? (
          <Banner tone="warn">{cancelled.note ?? "This order was cancelled."}</Banner>
        ) : (
          <Stepper steps={steps(order)} />
        )}
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <FactList
              facts={[
                { label: "Goods", value: order.title },
                { label: "Quantity", value: `${order.quantity} ${order.unit}`, numeric: true },
                { label: "Unit price", value: formatInr(order.unitPaise), numeric: true },
                { label: "Order value", value: formatInr(order.totalPaise), numeric: true },
                {
                  label: "Goods payment",
                  value:
                    order.paymentTerms === "credit"
                      ? `Credit, ${order.creditDays ?? 0} days`
                      : (PAYMENT_TERM_LABELS[order.paymentTerms] ?? order.paymentTerms),
                },
                {
                  label: "Expected delivery",
                  value: order.expectedDeliveryOn ? dateText(order.expectedDeliveryOn) : "Not set",
                },
                {
                  label: "Delivery to",
                  value: order.deliveryAddress
                    ? order.deliveryAddress
                    : [order.deliveryCity, stateName(order.deliveryStateCode)]
                        .filter(Boolean)
                        .join(", "),
                },
                ...(order.consigneeName
                  ? [{ label: "Consignee", value: order.consigneeName }]
                  : []),
              ]}
            />
            <section aria-labelledby="contacts-heading" className="flex flex-col gap-2">
              <h2 id="contacts-heading" className="text-xl font-bold">
                {order.side === "buyer" ? "Seller contact" : "Buyer contact"}
              </h2>
              {contacts ? (
                <FactList
                  facts={[
                    { label: "Business", value: contacts.legalName },
                    { label: "GSTIN", value: contacts.gstin ?? "Not provided" },
                    { label: "Contact", value: contacts.contactName ?? "Not provided" },
                    { label: "Phone", value: contacts.phone ?? "Not provided" },
                    { label: "Email", value: contacts.email ?? "Not provided" },
                    { label: "Address", value: contacts.address },
                  ]}
                />
              ) : (
                <p className="text-muted">
                  Contact details open after the seller accepts and pays the fee.
                </p>
              )}
            </section>
            {order.documents.length > 0 ? (
              <section aria-labelledby="documents-heading" className="flex flex-col gap-2">
                <h2 id="documents-heading" className="text-xl font-bold">
                  Dispatch documents
                </h2>
                <ul className="flex flex-col gap-1">
                  {order.documents.map((document) => (
                    <li key={document.kind}>
                      <b>{DOCUMENT_LABELS[document.kind] ?? document.kind}:</b>{" "}
                      {document.path && document.readable ? (
                        <Link
                          href={`/api/v1/orders/${order.id}/files/${document.kind}`}
                          prefetch={false}
                        >
                          Open file
                        </Link>
                      ) : null}
                      {document.path && !document.readable ? (
                        <span className="text-muted">Waiting for a safety check</span>
                      ) : null}
                      {document.referenceNo ? ` ${document.referenceNo}` : null}
                      {document.notApplicableReason
                        ? ` Not needed: ${document.notApplicableReason}`
                        : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {pdfLinks.length > 0 ? (
              <section aria-labelledby="downloads-heading" className="flex flex-col gap-2">
                <h2 id="downloads-heading" className="text-xl font-bold">
                  Downloads
                </h2>
                <div className="flex flex-wrap gap-2">
                  {pdfLinks.map((link) => (
                    <ButtonLink
                      key={link.kind}
                      href={`/api/v1/orders/${order.id}/documents/${link.kind}`}
                      variant="secondary"
                    >
                      {link.label}
                    </ButtonLink>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <ActionPanels order={order} paymentsEnabled={paymentsEnabled} />
          </div>
        </div>
      </main>
    </>
  );
}
