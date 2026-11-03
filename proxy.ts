import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/session";

/** Redirects for convenience only. Row-level security is the real boundary. */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await refreshSession(request);
  if (signedIn) return response;

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/buyer/:path*", "/seller/:path*", "/admin/:path*", "/onboarding/:path*"],
};
