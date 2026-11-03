import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund policy"
      points={[
        "Bid Market collects platform fees only. Goods refunds are between buyer and seller.",
        "A fee may return to your wallet when a tender gets no valid bids or the seller side fails.",
        "Wallet balances pay future platform fees and cannot be withdrawn to a bank account.",
      ]}
    />
  );
}
