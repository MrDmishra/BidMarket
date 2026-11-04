import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/layout/content-page";
import { ButtonLink } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { stateName } from "@/lib/india/states";
import { getPublicTender } from "@/modules/tenders";
import { closingText } from "@/modules/tenders/tender-labels";

export const metadata: Metadata = { title: "Tender" };
export const dynamic = "force-dynamic";

type TenderPageProps = { params: Promise<{ id: string }> };

export default async function TenderPage({ params }: TenderPageProps) {
  const { id } = await params;
  const tender = await getPublicTender(id);
  if (!tender) notFound();

  return (
    <ContentPage title={tender.title} intro={tender.tenderNo}>
      <FactList
        facts={[
          { label: "Category", value: tender.categoryName },
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
      <div>
        <ButtonLink href={`/seller/tenders/${tender.id}`}>Bid as a seller</ButtonLink>
      </div>
    </ContentPage>
  );
}
