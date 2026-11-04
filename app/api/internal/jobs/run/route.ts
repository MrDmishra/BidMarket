import { createHash, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env/server";
import { logger } from "@/lib/logger";
import { runBillingJobs } from "@/modules/billing/jobs";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export async function POST(request: Request) {
  const secret = getServerEnv().INTERNAL_JOB_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(digest(supplied), digest(`Bearer ${secret}`))) {
    return Response.json({ error: "Not allowed" }, { status: 401 });
  }
  try {
    return Response.json(await runBillingJobs());
  } catch (error) {
    logger.error("Job run failed", { error });
    return Response.json({ error: "Job run failed" }, { status: 500 });
  }
}
