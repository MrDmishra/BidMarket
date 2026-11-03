import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { Banner } from "@/components/ui/banner";

export const metadata: Metadata = { title: "How it works" };

const PATHS = [
  {
    title: "For buyers",
    steps: [
      "Register free and pass admin verification.",
      "Order directly, or publish a tender with your specification.",
      "Evaluate bids, or let the auction find L1.",
      "Pay the seller directly, then confirm receipt with a photo.",
    ],
  },
  {
    title: "For sellers",
    steps: [
      "Register with PAN, GSTIN and turnover, then pay the subscription.",
      "List products. An admin verifies each one.",
      "Bid on tenders that match your categories.",
      "Accept, dispatch with documents, and collect payment from the buyer.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <ContentPage
      title="How it works"
      intro="Buyers and sellers follow one clear path from verification to acceptance report."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {PATHS.map((path) => (
          <section
            key={path.title}
            className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
          >
            <h2 className="text-2xl font-bold">{path.title}</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              {path.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <Banner>
        Bid Market connects buyers and sellers. The contract for goods is between them, and the
        platform does not hold goods or the goods payment.
      </Banner>
    </ContentPage>
  );
}
