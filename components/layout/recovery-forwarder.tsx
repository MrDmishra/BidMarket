"use client";

import { useEffect } from "react";

/**
 * If Supabase does not allow the reset page as a return address, it sends the link to the home
 * page instead. This passes such a link on to the reset page.
 */
export function RecoveryForwarder() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (
      pathname !== "/reset-link" &&
      hash.includes("access_token=") &&
      hash.includes("type=recovery")
    ) {
      window.location.replace(`/reset-link${hash}`);
    }
  }, []);
  return null;
}
