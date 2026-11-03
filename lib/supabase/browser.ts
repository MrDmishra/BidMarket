import { createBrowserClient } from "@supabase/ssr";
import { AppError } from "@/lib/errors/app-error";
import { publicEnv } from "@/lib/env/public";

/** Browser use is limited to Auth and Realtime. Business data goes through the server. */
export function createBrowserSupabaseClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = publicEnv;
  if (!url || !key) throw new AppError("SERVICE_UNAVAILABLE");
  return createBrowserClient(url, key);
}
