import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/domain-types";

/** Bypasses row-level security. Webhooks and jobs only, as AGENTS.md section 11 requires. */
export function createServiceClient() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError("SERVICE_UNAVAILABLE");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
