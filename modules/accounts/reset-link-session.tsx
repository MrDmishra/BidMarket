"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/banner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { parseRecoveryHash } from "@/lib/supabase/recovery-hash";

/** Turns the sign-in in a reset link into a session, then opens the new password page. */
export function ResetLinkSession() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const link = parseRecoveryHash(window.location.hash);
    // The sign-in should not stay in the address bar or the browser history.
    window.history.replaceState(null, "", window.location.pathname);
    const signedIn = link
      ? createBrowserSupabaseClient()
          .auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
          .then(({ error }) => !error)
      : Promise.resolve(false);
    void signedIn
      .catch(() => false)
      .then((ok) => (ok ? router.replace("/reset-password") : setFailed(true)));
  }, [router]);

  return failed ? (
    <>
      <Banner tone="bad">This reset link has expired or was already used.</Banner>
      <Link className="underline" href="/forgot-password">
        Request a new link
      </Link>
    </>
  ) : (
    <p className="text-muted" role="status">
      Opening your reset link…
    </p>
  );
}
