import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

const ALLOWED_NEXT = new Set(["/onboarding", "/reset-password"]);

/** Limits the destination, so a crafted link cannot send users to another site. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "";
  const next = ALLOWED_NEXT.has(requestedNext) ? requestedNext : "/onboarding";

  if (code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?link=expired", origin));
}
