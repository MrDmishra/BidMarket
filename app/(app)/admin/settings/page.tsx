import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/lib/auth/account";
import { ApiForm } from "@/modules/accounts/api-form";
import { getFeeSchedule } from "@/modules/billing";

export const metadata: Metadata = { title: "Fees and settings" };

const toPercent = (bps: number) => String(bps / 100);
const toRupees = (paise: number) => String(paise / 100);

export default async function AdminSettingsPage() {
  const account = await requireAdmin();
  const fees = await getFeeSchedule();

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex max-w-xl flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">Fees and settings</h1>
        <p className="text-muted">
          Changes apply to new charges only. Charges already created keep their rates.
        </p>
        <ApiForm
          id="platform-settings"
          endpoint="/api/v1/admin/settings"
          submitLabel="Save settings"
          fields={[
            {
              name: "directFee",
              label: "Direct order fee (%)",
              defaultValue: toPercent(fees.directFeeBps),
            },
            {
              name: "tenderFee",
              label: "Tender fee (%)",
              defaultValue: toPercent(fees.tenderFeeBps),
            },
            { name: "gst", label: "GST (%)", defaultValue: toPercent(fees.gstBps) },
            {
              name: "tds",
              label: "TDS (%)",
              hint: "Keep at 0 until your chartered accountant confirms it.",
              defaultValue: "0",
            },
            {
              name: "subscriptionBase",
              label: "Subscription base fee (₹)",
              defaultValue: toRupees(fees.subscriptionBasePaise),
            },
            {
              name: "subscriptionStep",
              label: "Fee per extra ₹1 crore (₹)",
              defaultValue: toRupees(fees.subscriptionStepPaise),
            },
            {
              name: "freeSellers",
              label: "Sellers who get a free first year",
              hint: "0 means every seller pays. 100 means the first 100 sellers get a free year.",
              defaultValue: String(fees.freeSubscriptionSellers),
            },
            { name: "reason", label: "Reason for this change" },
          ]}
        />
      </main>
    </>
  );
}
