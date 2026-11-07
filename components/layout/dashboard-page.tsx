import Link from "next/link";
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
    note: "Your details are saved. Pay your subscription to go live.",
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

export type AttentionItem = { key: string; label: string; href: string; due?: string };

type DashboardPageProps = {
  title: string;
  organisationName: string;
  status: OrgStatus;
  attention?: AttentionItem[];
};

export function DashboardPage({
  title,
  organisationName,
  status,
  attention = [],
}: DashboardPageProps) {
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
        {attention.length > 0 ? (
          <section aria-labelledby="attention-heading" className="flex flex-col gap-2">
            <h2 id="attention-heading" className="text-xl font-bold">
              Needs your attention
            </h2>
            <ul className="flex flex-col gap-2">
              {attention.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex flex-wrap justify-between gap-2 rounded-panel border border-line bg-surface p-3 hover:border-brand"
                  >
                    <span>{item.label}</span>
                    {item.due ? <span className="text-sm text-muted">By {item.due}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {status === "active" && title.startsWith("Seller") ? (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/seller/tenders">Tenders</ButtonLink>
            <ButtonLink href="/seller/orders" variant="secondary">
              Orders
            </ButtonLink>
            <ButtonLink href="/seller/products" variant="secondary">
              Manage products
            </ButtonLink>
            <ButtonLink href="/seller/billing" variant="secondary">
              Billing
            </ButtonLink>
            <ButtonLink href="/support" variant="secondary">
              Support
            </ButtonLink>
          </div>
        ) : null}
        {status === "active" && title.startsWith("Buyer") ? (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/buyer/tenders">Tenders</ButtonLink>
            <ButtonLink href="/buyer/orders" variant="secondary">
              Orders
            </ButtonLink>
            <ButtonLink href="/products" variant="secondary">
              Browse products
            </ButtonLink>
            <ButtonLink href="/buyer/billing" variant="secondary">
              Billing
            </ButtonLink>
            <ButtonLink href="/support" variant="secondary">
              Support
            </ButtonLink>
          </div>
        ) : null}
        {status === "pending_payment" ? (
          <div>
            <ButtonLink href="/seller/billing">Pay subscription</ButtonLink>
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
