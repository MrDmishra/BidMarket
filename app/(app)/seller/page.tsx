import type { Metadata } from "next";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { requireOrganisation } from "@/lib/auth/account";

export const metadata: Metadata = { title: "Seller dashboard" };

export default async function SellerDashboardPage() {
  const { organisation } = await requireOrganisation("seller");
  return (
    <DashboardPage
      title="Seller dashboard"
      organisationName={organisation.legalName}
      status={organisation.status}
    />
  );
}
