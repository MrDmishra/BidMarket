import type { Metadata } from "next";
import { requireOrganisation } from "@/lib/auth/account";
import { InvoiceView } from "@/modules/billing/invoice-view";

export const metadata: Metadata = { title: "Tax invoice" };

type InvoicePageProps = { params: Promise<{ id: string }> };

export default async function BuyerInvoicePage({ params }: InvoicePageProps) {
  const { organisation } = await requireOrganisation("buyer");
  const { id } = await params;
  return <InvoiceView id={id} organisationName={organisation.legalName} />;
}
