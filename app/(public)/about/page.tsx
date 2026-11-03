import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ContentPage title="About Bid Market">
      <div className="flex max-w-[65ch] flex-col gap-3">
        <p>
          Bid Market is a private B2B marketplace for India, built for purchase teams that need
          competing prices and a clear record of every purchase.
        </p>
        <p>
          Buyers can order directly, collect sealed bids, or run a reverse auction. Sellers reach
          verified buyers and compete in a transparent process.
        </p>
        <p className="text-muted">The marketplace is in development and is not open for trading.</p>
      </div>
    </ContentPage>
  );
}
