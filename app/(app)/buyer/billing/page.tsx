import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { requireOrganisation } from "@/lib/auth/account";
import { getBillingOverview } from "@/modules/billing";
import { BillingSections } from "@/modules/billing/billing-sections";

export const metadata: Metadata = { title: "Billing" };

export default async function BuyerBillingPage() {
  const { organisation } = await requireOrganisation("buyer");
  const overview = await getBillingOverview();

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-6 py-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <BillingSections overview={overview} invoiceBase="/buyer/billing/invoices" />
      </main>
    </>
  );
}
