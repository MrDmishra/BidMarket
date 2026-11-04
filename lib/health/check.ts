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
    const response = await fetchImpl(new URL("/rest/v1/rpc/health_check", supabaseUrl), {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: "{}",
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
