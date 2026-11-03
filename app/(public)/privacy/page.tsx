import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      points={[
        "We collect only the data needed to verify accounts and run transactions.",
        "Aadhaar numbers and images are not stored.",
        "Bank and PAN details are encrypted.",
        "Contact details are shared only after a seller accepts and the fee is paid.",
      ]}
    />
  );
}
