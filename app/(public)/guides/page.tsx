import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Guides" };

const ITEMS = [
  [
    "Which buying method should I use?",
    "Use a direct order for small purchases you know well. Use a bid when you want to judge sellers on more than price. Use a reverse auction when the specification is fixed and price is the only variable.",
  ],
  [
    "What does L1 mean?",
    "L1 is the lowest valid price. L2 is the next lowest. If L1 declines an award, the offer moves down the list.",
  ],
  [
    "Why run Bid to RA?",
    "The bid stage gives you a price range and removes outliers. The auction then pushes the remaining sellers against each other.",
  ],
  [
    "How can a seller win more tenders?",
    "Keep your relevant categories listed and in stock, include delivery in your price, and bid only what you can fulfil. Rejecting an award blocks your account for a period.",
  ],
];

export default function GuidesPage() {
  return (
    <ContentPage title="Guides" intro="Short guides to buying and selling through tenders.">
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
