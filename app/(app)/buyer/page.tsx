import type { Metadata } from "next";
import { DashboardPage } from "@/components/layout/dashboard-page";
import { requireOrganisation } from "@/lib/auth/account";
import { attentionLinks } from "@/modules/support";

export const metadata: Metadata = { title: "Buyer dashboard" };

export default async function BuyerDashboardPage() {
  const { organisation } = await requireOrganisation("buyer");
  const attention = organisation.status === "active" ? await attentionLinks() : [];
  return (
    <DashboardPage
      title="Buyer dashboard"
      organisationName={organisation.legalName}
      status={organisation.status}
      attention={attention}
    />
  );
}
