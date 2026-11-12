import type { Metadata } from "next";
import { ResetLinkSession } from "@/modules/accounts/reset-link-session";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetLinkPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <ResetLinkSession />
    </>
  );
}
