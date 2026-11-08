import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { emailLinkSchema, linkDestination } from "@/lib/supabase/email-links";
import { createUserClient } from "@/lib/supabase/server";

/**
 * Email links that carry a token hash work in any browser, including the Gmail app. The older
 * code links in /auth/callback only work in the browser that asked for the email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const link = emailLinkSchema.safeParse(Object.fromEntries(searchParams));
  if (link.success) {
    try {
      const supabase = await createUserClient();
      const { error } = await supabase.auth.verifyOtp({
        type: link.data.type,
        token_hash: link.data.token_hash,
      });
      if (!error) {
        const next = linkDestination(searchParams.get("next"), link.data.type);
        return NextResponse.redirect(new URL(next, origin));
      }
    } catch (error) {
      // The user still needs a way forward, so a failure ends on the "request a new link" page.
      logger.error("Email link check failed", { error });
    }
  }
  return NextResponse.redirect(new URL("/login?link=expired", origin));
}
