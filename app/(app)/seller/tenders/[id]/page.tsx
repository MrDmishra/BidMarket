import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { MoneySummary } from "@/components/ui/money-summary";
import { requireOrganisation } from "@/lib/auth/account";
import { stateName } from "@/lib/india/states";
import { formatInr } from "@/lib/money";
import { isRazorpayConfigured } from "@/lib/providers/razorpay-client";
import { PayButton } from "@/modules/billing/pay-button";
import { getSellerTender } from "@/modules/tenders";
import { SellerAuctionPanel } from "@/modules/tenders/seller-auction-panel";
import { TenderAction } from "@/modules/tenders/tender-action";
import { closingText } from "@/modules/tenders/tender-labels";

export const metadata: Metadata = { title: "Tender" };

const MAX_ATTEMPTS = 3;

type TenderPageProps = { params: Promise<{ id: string }> };

export default async function SellerTenderPage({ params }: TenderPageProps) {
  const { organisation } = await requireOrganisation("seller");
  const { id } = await params;
  const tender = await getSellerTender(id);
  if (!tender) notFound();
  const bids = `/api/v1/seller/tenders/${id}/bids`;
  const award = `/api/v1/seller/tenders/${id}/award`;
  const offered = tender.award?.status === "offered" ? tender.award : null;
  const payable = tender.charge?.status === "pending" ? tender.charge : null;
  const attemptsLeft = MAX_ATTEMPTS - tender.attemptsUsed;
  const inBidToRaAuction =
    !tender.eliminated && (tender.status === "auction_scheduled" || tender.status === "auction");

  return (
    <>
      <AppHeader name={organisation.legalName} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <h1 className="text-2xl font-bold">{tender.title}</h1>
        <p className="font-mono text-sm text-muted">{tender.tenderNo}</p>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <FactList
            facts={[
              { label: "Quantity", value: `${tender.quantity} ${tender.unit}`, numeric: true },
              { label: "Delivery", value: stateName(tender.deliveryStateCode) },
              { label: "Bidding closes", value: closingText(tender.bidEndsAt) },
              { label: "Contract period", value: `${tender.contractMonths} months` },
              ...tender.specs.map((spec) => ({
                label: spec.label,
                value: [spec.value, spec.unit].filter(Boolean).join(" "),
              })),
            ]}
          />
          <div className="flex min-w-0 flex-col gap-4">
            {tender.type === "ra" || (tender.type === "bid_to_ra" && inBidToRaAuction) ? (
              <SellerAuctionPanel tenderId={tender.id} unit={tender.unit} />
            ) : null}
            {tender.type === "bid_to_ra" && tender.status === "shortlisting" ? (
              <Banner>
                Sealed bidding has closed. The buyer is choosing which sellers go to the auction
                {tender.raStartsAt ? ` starting ${closingText(tender.raStartsAt)}` : ""}.
              </Banner>
            ) : null}
            {tender.eliminated ? (
              <Banner tone="warn">
                Your sealed bid was not shortlisted, so you cannot bid in the auction.
              </Banner>
            ) : null}
            {tender.open ? (
              <ActionPanel title="Your bid">
                {tender.myBidPaise ? (
                  <p>
                    Current bid:{" "}
                    <b className="font-mono tabular-nums">{formatInr(tender.myBidPaise)}</b> per{" "}
                    {tender.unit}
                  </p>
                ) : null}
                {tender.eligible && attemptsLeft > 0 ? (
                  <TenderAction
                    endpoint={bids}
                    buttonLabel="Submit sealed bid"
                    field={{
                      id: "unit-price",
                      label: `Price per ${tender.unit} (₹)`,
                      name: "unitPrice",
                      hint: `${attemptsLeft} of ${MAX_ATTEMPTS} attempts left.`,
                      inputMode: "decimal",
                    }}
                    note="Only you can see your bid until bidding closes."
                  />
                ) : null}
                {!tender.eligible ? (
                  <Banner tone="warn">
                    List a published product in this category and delivery state to bid.
                  </Banner>
                ) : null}
                {tender.myBidPaise ? (
                  <TenderAction
                    endpoint={bids}
                    method="DELETE"
                    buttonLabel="Withdraw bid"
                    variant="secondary"
                  />
                ) : null}
              </ActionPanel>
            ) : null}
            {offered ? (
              <ActionPanel title="You won this tender">
                <p>
                  Value <b className="font-mono tabular-nums">{formatInr(offered.totalPaise)}</b>.
                  {offered.expiresAt ? ` Respond by ${closingText(offered.expiresAt)}.` : ""}
                </p>
                {payable ? (
                  <>
                    <MoneySummary
                      valuePaise={offered.totalPaise}
                      feePaise={payable.feePaise}
                      gstPaise={payable.gstPaise}
                    />
                    {isRazorpayConfigured() ? (
                      <PayButton
                        chargeId={payable.id}
                        label={`Pay ${formatInr(payable.totalPaise)}`}
                      />
                    ) : (
                      <Banner>Online payment is not switched on yet. Try again later.</Banner>
                    )}
                  </>
                ) : (
                  <TenderAction
                    endpoint={`${award}/accept`}
                    buttonLabel="Accept award"
                    note="Accepting is binding. You pay your fee on the next step."
                  />
                )}
                <TenderAction
                  endpoint={`${award}/reject`}
                  buttonLabel="Reject award"
                  variant="danger"
                  field={{ id: "reject-reason", label: "Reason for rejecting", name: "reason" }}
                  note="Rejecting adds a strike and blocks your account for at least 30 days."
                />
              </ActionPanel>
            ) : null}
            {tender.orderId ? (
              <ActionPanel title="Order">
                <ButtonLink href={`/seller/orders/${tender.orderId}`}>Open the order</ButtonLink>
              </ActionPanel>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
