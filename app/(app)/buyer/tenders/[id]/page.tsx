import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { MoneySummary } from "@/components/ui/money-summary";
import { StatusPill } from "@/components/ui/status-pill";
import { requireOrganisation } from "@/lib/auth/account";
import { formatInr } from "@/lib/money";
import { isRazorpayConfigured } from "@/lib/providers/razorpay-client";
import { PayButton } from "@/modules/billing/pay-button";
import { getBuyerTender, listTenderBids } from "@/modules/tenders";
import { BuyerAuctionStatus } from "@/modules/tenders/buyer-auction-status";
import { TenderAction } from "@/modules/tenders/tender-action";
import { closingText, TENDER_STATUS } from "@/modules/tenders/tender-labels";

export const metadata: Metadata = { title: "Tender" };

type TenderPageProps = { params: Promise<{ id: string }> };

export default async function BuyerTenderPage({ params }: TenderPageProps) {
  const { organisation } = await requireOrganisation("buyer");
  const { id } = await params;
  const tender = await getBuyerTender(id);
  if (!tender) notFound();
  const showBids = tender.status === "evaluating";
  const bids = showBids ? await listTenderBids(id) : [];
  const endpoint = `/api/v1/buyer/tenders/${id}`;
  const payable = tender.charge?.status === "pending" ? tender.charge : null;

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{tender.title}</h1>
          <StatusPill {...(TENDER_STATUS[tender.status] ?? TENDER_STATUS.draft!)} />
          <Link
            className="ml-auto text-sm underline"
            href={`/support?tenderId=${tender.id}&ref=${encodeURIComponent(tender.tenderNo)}`}
          >
            Report a problem
          </Link>
        </div>
        <p className="font-mono text-sm text-muted">{tender.tenderNo}</p>
        {tender.cancelReason ? <Banner tone="warn">{tender.cancelReason}</Banner> : null}
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <FactList
              facts={[
                { label: "Quantity", value: `${tender.quantity} ${tender.unit}`, numeric: true },
                {
                  label: "Estimated unit price",
                  value: formatInr(tender.estimateUnitPaise),
                  numeric: true,
                },
                { label: "Bidding closes", value: closingText(tender.bidEndsAt) },
                ...(tender.raStartsAt
                  ? [{ label: "Auction starts", value: closingText(tender.raStartsAt) }]
                  : []),
                { label: "Minimum bids", value: String(tender.minBids), numeric: true },
                {
                  label: "Extensions used",
                  value: `${tender.extensionsUsed} of ${tender.extensionsAllowed}`,
                },
                { label: "Consignee", value: tender.consigneeName },
                ...tender.specs.map((spec) => ({
                  label: spec.label,
                  value: [spec.value, spec.unit].filter(Boolean).join(" "),
                })),
              ]}
            />
            {tender.status === "bidding" ? (
              <p className="text-muted">Bids stay sealed until bidding closes.</p>
            ) : null}
            {tender.status === "auction_scheduled" || tender.status === "auction" ? (
              <BuyerAuctionStatus tenderId={tender.id} />
            ) : null}
            {showBids ? (
              <section aria-labelledby="bids-heading" className="flex flex-col gap-3">
                <h2 id="bids-heading" className="text-xl font-bold">
                  Bids
                </h2>
                <p className="text-sm text-muted">
                  Sellers stay anonymous until one accepts and pays the fee.
                </p>
                <ul className="flex flex-col gap-3">
                  {bids.map((bid) => (
                    <li
                      key={bid.rank}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-4"
                    >
                      <span>
                        <b>L{bid.rank}</b>{" "}
                        <span className="font-mono tabular-nums">{formatInr(bid.unit_paise)}</span>{" "}
                        per {tender.unit}, total {formatInr(bid.total_paise)}
                      </span>
                      <TenderAction
                        endpoint={`${endpoint}/award`}
                        body={{ rank: bid.rank }}
                        buttonLabel={`Award L${bid.rank}`}
                        variant={bid.rank === 1 ? "primary" : "secondary"}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {tender.status === "shortlisting" ? (
              <ActionPanel title="Shortlist sellers for the auction">
                <p>
                  <b className="font-mono tabular-nums">{tender.sealedBidCount ?? 0}</b> sealed bids
                  arrived. Prices stay hidden until the auction closes.
                </p>
                {tender.raStartsAt ? (
                  <p className="text-sm text-muted">
                    Choose before {closingText(tender.raStartsAt)}. If you do not choose, every
                    seller who bid joins the auction.
                  </p>
                ) : null}
                <TenderAction
                  endpoint={`${endpoint}/shortlist`}
                  body={{ mode: "highest" }}
                  buttonLabel="Remove the highest bidder"
                  variant="secondary"
                  note="Sellers tied at the highest price all leave."
                />
                <TenderAction
                  endpoint={`${endpoint}/shortlist`}
                  body={{ mode: "highest50" }}
                  buttonLabel="Remove the highest half"
                  variant="secondary"
                />
              </ActionPanel>
            ) : null}
            {tender.status === "draft" ? (
              <ActionPanel title="Publish">
                <TenderAction endpoint={`${endpoint}/publish`} buttonLabel="Review the fee" />
              </ActionPanel>
            ) : null}
            {payable ? (
              <ActionPanel title="Platform fee">
                <MoneySummary
                  valuePaise={tender.estimateTotalPaise}
                  feePaise={payable.feePaise}
                  gstPaise={payable.gstPaise}
                />
                {isRazorpayConfigured() ? (
                  <PayButton chargeId={payable.id} label={`Pay ${formatInr(payable.totalPaise)}`} />
                ) : (
                  <Banner>Online payment is not switched on yet. Try again later.</Banner>
                )}
              </ActionPanel>
            ) : null}
            {tender.status === "draft" || tender.status === "unpaid" ? (
              <ActionPanel title="Change of plan">
                <TenderAction
                  endpoint={`${endpoint}/cancel`}
                  buttonLabel="Cancel tender"
                  variant="danger"
                  field={{ id: "cancel-reason", label: "Reason for cancelling", name: "reason" }}
                />
              </ActionPanel>
            ) : null}
            {tender.orderId ? (
              <ActionPanel title="Order">
                <ButtonLink href={`/buyer/orders/${tender.orderId}`}>Open the order</ButtonLink>
              </ActionPanel>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
