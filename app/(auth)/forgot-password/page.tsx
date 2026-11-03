import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/modules/accounts/auth-actions";
import { AuthForm } from "@/modules/accounts/auth-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <p className="text-sm">
        <Link href="/login">Back to log in</Link>
      </p>
    </>
  );
}
