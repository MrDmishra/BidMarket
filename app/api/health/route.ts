import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { getServerEnv } from "@/lib/env/server";
import { checkHealth } from "@/lib/health/check";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  try {
    const env = getServerEnv();
    const report = await checkHealth({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    return jsonOk(report, requestId, { status: report.status === "ok" ? 200 : 503 });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
