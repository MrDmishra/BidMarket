import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors/app-error";
import { getServerEnv } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";

/** Runs as the signed-in user, so row-level security applies to every query. */
export async function createUserClient() {
  const env = getServerEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new AppError("SERVICE_UNAVAILABLE");
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
