import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      points={[
        "Bid Market connects buyers and sellers. The contract for goods is between them.",
        "Listed and quoted prices include taxes, packing and delivery.",
        "Sealed bids stay hidden until opening, and buyers cannot see prices in a live auction.",
        "A seller who rejects an award is blocked for 30, 60 or 180 days, then permanently.",
        "Disputes go through incidents. Technical problems go through tickets.",
      ]}
    />
  );
}
