import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Cancellation policy" };

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      title="Cancellation policy"
      points={[
        "A seller may reject a direct order before accepting it.",
        "An accepted order is binding on both sides.",
        "A tender cancels automatically when minimum bids are not reached after all extensions.",
        "A cancelled tender cannot be revived.",
      ]}
    />
  );
}
