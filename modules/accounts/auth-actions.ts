"use server";

import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env/public";
import { logger } from "@/lib/logger";
import { createUserClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  forgotPasswordSchema,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/modules/accounts/schemas";

export type AuthFormState = {
  error?: string;
  fields?: Record<string, string>;
  message?: string;
};

const UNAVAILABLE = "Accounts are not available right now. Try again shortly.";
const EXPIRED_LINK = "This reset link has expired. Request a new one.";
const CODE_NEEDED = "Enter the 6-digit code from your authenticator app.";

function callbackUrl(next: string) {
  const base = publicEnv.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function logIn(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const input = logInSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { fields: fieldErrors(input.error) };

  try {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword(input.data);
    if (error) return { error: "Check your email and password, then try again." };
  } catch (error) {
    logger.error("Log in failed", { error });
    return { error: UNAVAILABLE };
  }
  redirect("/onboarding");
}

export async function signUp(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const input = signUpSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { fields: fieldErrors(input.error) };

  let hasSession = false;
  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.data.email,
      password: input.data.password,
      options: { emailRedirectTo: callbackUrl("/onboarding") },
    });
    if (error) {
      logger.warn("Sign-up refused", { code: error.code });
      return { error: "We could not create your account. Check your details and try again." };
    }
    hasSession = Boolean(data.session);
  } catch (error) {
    logger.error("Sign-up failed", { error });
    return { error: UNAVAILABLE };
  }
  if (hasSession) redirect("/onboarding");
  return { message: "Check your email and open the confirmation link to continue." };
}

export async function requestPasswordReset(
  _state: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const input = forgotPasswordSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { fields: fieldErrors(input.error) };

  try {
    const supabase = await createUserClient();
    await supabase.auth.resetPasswordForEmail(input.data.email, {
      redirectTo: callbackUrl("/reset-password"),
    });
  } catch (error) {
    logger.error("Password reset request failed", { error });
    return { error: UNAVAILABLE };
  }
  // The same reply for every address, so this form cannot reveal who has an account.
  return { message: "If that address has an account, a reset link is on its way." };
}

export async function resetPassword(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const input = resetPasswordSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { fields: fieldErrors(input.error) };

  try {
    const supabase = await createUserClient();
    // Supabase refuses a new password for a two-factor account until the code is checked.
    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (level?.currentLevel === "aal1" && level.nextLevel === "aal2") {
      if (!input.data.code) return { fields: { code: CODE_NEEDED } };
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((item) => item.status === "verified");
      if (!factor) return { error: EXPIRED_LINK };
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: input.data.code,
      });
      if (error) return { fields: { code: "That code did not work. Enter the latest code." } };
    }
    const { error } = await supabase.auth.updateUser({ password: input.data.password });
    if (error) return { error: EXPIRED_LINK };
  } catch (error) {
    logger.error("Password reset failed", { error });
    return { error: UNAVAILABLE };
  }
  redirect("/onboarding");
}

export async function logOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/");
}
