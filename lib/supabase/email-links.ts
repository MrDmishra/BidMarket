import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";

/** Limits where an email link may land, so a crafted link cannot send users to another site. */
const ALLOWED_NEXT = new Set(["/onboarding", "/reset-password"]);

const EMAIL_LINK_TYPES = [
  "recovery",
  "signup",
  "email",
  "invite",
  "magiclink",
  "email_change",
] as const satisfies readonly EmailOtpType[];

export const emailLinkSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(EMAIL_LINK_TYPES),
});

export function linkDestination(requested: string | null, type?: EmailOtpType): string {
  if (requested && ALLOWED_NEXT.has(requested)) return requested;
  return type === "recovery" ? "/reset-password" : "/onboarding";
}
