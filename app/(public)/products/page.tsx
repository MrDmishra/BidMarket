import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <ContentPage title="Products" intro="Browse products from verified sellers.">
      <EmptyState
        message="Products appear here when sellers start listing."
        action={
          <ButtonLink href="/how-it-works" variant="secondary">
            See how it works
          </ButtonLink>
        }
      />
    </ContentPage>
  );
}
