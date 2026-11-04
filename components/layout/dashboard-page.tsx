import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import type { OrgStatus } from "@/lib/supabase/domain-types";

const STATUS: Record<OrgStatus, { label: string; tone: PillTone; note: string }> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    note: "Add your business details to get verified.",
  },
  pending_payment: {
    label: "Pending",
    tone: "warn",
    note: "Your details are saved. Subscription payment opens soon.",
  },
  pending_review: { label: "Pending", tone: "warn", note: "An admin is reviewing your account." },
  active: { label: "Active", tone: "ok", note: "Your account is verified." },
  suspended: {
    label: "Suspended",
    tone: "bad",
    note: "Your account is suspended. Contact support.",
  },
  rejected: {
    label: "Rejected",
    tone: "bad",
    note: "Your account was not approved. Contact support.",
  },
};

type DashboardPageProps = { title: string; organisationName: string; status: OrgStatus };

export function DashboardPage({ title, organisationName, status }: DashboardPageProps) {
  const details = STATUS[status];
  return (
    <>
      <AppHeader name={organisationName} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{title}</h1>
          <StatusPill tone={details.tone} label={details.label} />
        </div>
        <Banner>{details.note}</Banner>
        {status === "active" && title.startsWith("Seller") ? (
          <div>
            <ButtonLink href="/seller/products">Manage products</ButtonLink>
          </div>
        ) : null}
        {status === "draft" ? (
          <div>
            <ButtonLink href="/onboarding/verify">Complete verification</ButtonLink>
          </div>
        ) : null}
      </main>
    </>
  );
}
