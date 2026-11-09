import type { Metadata } from "next";
import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import { AppError } from "@/lib/errors/app-error";
import { createUserClient } from "@/lib/supabase/server";
import { resetPassword } from "@/modules/accounts/auth-actions";
import { AuthForm, type AuthField } from "@/modules/accounts/auth-form";

export const metadata: Metadata = { title: "Choose a new password" };

const PASSWORD_FIELDS: AuthField[] = [
  {
    name: "password",
    label: "New password",
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
];

const CODE_FIELD: AuthField = {
  name: "code",
  label: "Authenticator code",
  type: "text",
  inputMode: "numeric",
  autoComplete: "one-time-code",
  hint: "Your account uses two-factor sign-in, so enter the 6-digit code from your app.",
};

/** Who opened the link, and whether their account also needs an authenticator code. */
async function resetSession() {
  try {
    const supabase = await createUserClient();
    const [{ data: user }, { data: level }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    return {
      available: true,
      signedIn: Boolean(user.user),
      needsCode: level?.currentLevel === "aal1" && level.nextLevel === "aal2",
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "SERVICE_UNAVAILABLE") {
      return { available: false, signedIn: false, needsCode: false };
    }
    throw error;
  }
}

export default async function ResetPasswordPage() {
  const { available, signedIn, needsCode } = await resetSession();

  return (
    <>
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      {!available ? (
        <Banner tone="bad">Accounts are not available right now. Try again shortly.</Banner>
      ) : signedIn ? (
        <AuthForm
          action={resetPassword}
          submitLabel="Save password"
          fields={needsCode ? [...PASSWORD_FIELDS, CODE_FIELD] : PASSWORD_FIELDS}
        />
      ) : (
        <>
          <Banner tone="bad">This reset link has expired or was opened in another browser.</Banner>
          <Link className="underline" href="/forgot-password">
            Request a new link
          </Link>
        </>
      )}
    </>
  );
}
