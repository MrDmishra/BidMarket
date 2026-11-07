import { z } from "zod";

export type SupabaseHealth = "ok" | "not_configured" | "unavailable";

const systemSchema = z.object({
  jobs: z.enum(["ok", "stale", "not_scheduled"]),
  outbox: z.enum(["ok", "backlog"]),
});
export type SystemHealth = z.infer<typeof systemSchema> | { jobs: "unknown"; outbox: "unknown" };

export type HealthReport = {
  status: "ok" | "degraded";
  app: "ok";
  supabase: SupabaseHealth;
  jobs: SystemHealth["jobs"];
  outbox: SystemHealth["outbox"];
};

const UNKNOWN = { jobs: "unknown", outbox: "unknown" } as const;

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

async function checkSystem({
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
  timeoutMs = 3000,
}: HealthInput): Promise<SystemHealth> {
  if (!supabaseUrl || !publishableKey) return UNKNOWN;
  try {
    const response = await fetchImpl(new URL("/rest/v1/rpc/system_health", supabaseUrl), {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return UNKNOWN;
    const parsed = systemSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

/** Email backlog is reported but does not fail the check, so a missing email key cannot page anyone. */
export async function checkHealth(input: HealthInput): Promise<HealthReport> {
  const [supabase, system] = await Promise.all([checkSupabase(input), checkSystem(input)]);
  const degraded = supabase === "unavailable" || system.jobs === "stale";
  return { status: degraded ? "degraded" : "ok", app: "ok", supabase, ...system };
}
