import type { Metadata } from "next";
import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import { logIn } from "@/modules/accounts/auth-actions";
import { AuthForm } from "@/modules/accounts/auth-form";

export const metadata: Metadata = { title: "Log in" };

type LoginPageProps = { searchParams: Promise<{ link?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { link } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Log in</h1>
      {link === "expired" ? (
        <Banner tone="warn">That link has expired. Log in, or request a new link.</Banner>
      ) : null}
      <AuthForm
        action={logIn}
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      />
      <p className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/signup">Create an account</Link>
      </p>
    </>
  );
}
