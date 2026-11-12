import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { AppError } from "@/lib/errors/app-error";

/**
 * Sends reset emails whose link carries the sign-in itself, so the link works in any browser,
 * including the Gmail app. The default link only works in the browser that asked for it, and
 * changing that needs the Supabase email template edited, which is not always possible.
 */
export function createRecoveryClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = publicEnv;
  if (!url || !key) throw new AppError("SERVICE_UNAVAILABLE");
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
