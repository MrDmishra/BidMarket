import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { getInvoice } from "@/modules/billing";
import {
  buildInvoiceDocument,
  buildOrderDocument,
  ORDER_DOCUMENT_KINDS,
  type OrderDocumentKind,
} from "@/modules/documents/order-documents";
import { renderPdf } from "@/modules/documents/pdf";
import { getOrder, getOrderContacts, getOwnParty } from "@/modules/orders";

const isOrderDocument = (kind: string): kind is OrderDocumentKind =>
  ORDER_DOCUMENT_KINDS.some((item) => item === kind);

/** Built on request from the frozen order record, so every download is identical. */
export async function getOrderPdf(id: string, kind: string) {
  const order = await getOrder(id);
  if (!order || order.side === "admin" || !isOrderDocument(kind)) throw new AppError("NOT_FOUND");
  const ready = kind === "contract" ? order.contactsUnlocked : order.status === "completed";
  if (!ready) throw new AppError("INVALID_STATE");

  const other = await getOrderContacts(id);
  const own = await getOwnParty();
  const counterparty = { legalName: other.legalName, gstin: other.gstin, address: other.address };
  const parties =
    order.side === "buyer"
      ? { buyer: own, seller: counterparty }
      : { buyer: counterparty, seller: own };
  return {
    body: await renderPdf(buildOrderDocument(kind, order, parties)),
    fileName: `${order.orderNo}-${kind}.pdf`,
  };
}

export async function getInvoicePdf(id: string) {
  const invoice = await getInvoice(id);
  if (!invoice) throw new AppError("NOT_FOUND");
  return {
    body: await renderPdf(buildInvoiceDocument(invoice)),
    fileName: `${invoice.invoice_no.replaceAll("/", "-")}.pdf`,
  };
}
