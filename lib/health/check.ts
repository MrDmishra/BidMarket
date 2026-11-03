export type SupabaseHealth = "ok" | "not_configured" | "unavailable";

export type HealthReport = {
  status: "ok" | "degraded";
  app: "ok";
  supabase: SupabaseHealth;
};

type HealthInput = {
  supabaseUrl?: string;
  publishableKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

async function checkSupabase({
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
  timeoutMs = 3000,
}: HealthInput): Promise<SupabaseHealth> {
  if (!supabaseUrl || !publishableKey) return "not_configured";
  try {
    const response = await fetchImpl(new URL("/auth/v1/health", supabaseUrl), {
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return response.ok ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function checkHealth(input: HealthInput): Promise<HealthReport> {
  const supabase = await checkSupabase(input);
  return { status: supabase === "unavailable" ? "degraded" : "ok", app: "ok", supabase };
}
