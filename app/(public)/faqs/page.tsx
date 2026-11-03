import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "FAQs" };

const ITEMS = [
  [
    "Who can buy?",
    "Verified individuals, proprietorships, partnerships, trusts, societies, LLPs and companies.",
  ],
  ["Who can sell?", "Verified businesses with a GSTIN. Individuals cannot sell."],
  [
    "Does Bid Market hold my money for goods?",
    "No. Buyers pay sellers directly, on the payment terms stated in the order. Bid Market collects platform fees only.",
  ],
  [
    "When do I see the other party’s contact details?",
    "After the seller accepts and the platform fee is paid.",
  ],
  [
    "What if something goes wrong with an order?",
    "Raise an incident from the order. Both parties discuss it on the platform, and an admin records a decision.",
  ],
];

export default function FaqsPage() {
  return (
    <ContentPage title="FAQs" intro="Answers to common questions about Bid Market.">
      <div className="flex max-w-3xl flex-col gap-2">
        {ITEMS.map(([question, answer]) => (
          <details key={question} className="rounded-panel border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer font-semibold">{question}</summary>
            <p className="mt-2 max-w-[65ch] text-muted">{answer}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
