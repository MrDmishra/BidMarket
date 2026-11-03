import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Support" };

export default function ContactPage() {
  return (
    <ContentPage
      title="Support"
      intro="Tickets cover technical and account problems. Incidents cover disputes about an order."
    >
      <EmptyState
        message="Support opens when the marketplace launches. Until then, answers to common questions are in the FAQs."
        action={
          <ButtonLink href="/faqs" variant="secondary">
            Read the FAQs
          </ButtonLink>
        }
      />
    </ContentPage>
  );
}
