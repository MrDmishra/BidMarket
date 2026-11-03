import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <ContentPage
      title="Categories"
      intro="Each category sets the specifications that buyers filter on and sellers must fill in."
    >
      <EmptyState
        message="Categories appear here when the catalogue opens."
        action={
          <ButtonLink href="/how-it-works" variant="secondary">
            See how it works
          </ButtonLink>
        }
      />
    </ContentPage>
  );
}
