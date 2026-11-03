import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Tenders" };

export default function TendersPage() {
  return (
    <ContentPage title="Tenders" intro="Open bids and reverse auctions from verified buyers.">
      <EmptyState
        message="Open tenders appear here once buyers start publishing."
        action={
          <ButtonLink href="/how-it-works" variant="secondary">
            See how it works
          </ButtonLink>
        }
      />
    </ContentPage>
  );
}
