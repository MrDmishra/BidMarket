import type { Metadata } from "next";
import Link from "next/link";
import { signUp } from "@/modules/accounts/auth-actions";
import { AuthForm } from "@/modules/accounts/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Create your account</h1>
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "new-password",
            hint: "At least 10 characters.",
          },
          {
            name: "confirmPassword",
            label: "Confirm password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
      <p className="text-sm">
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}
