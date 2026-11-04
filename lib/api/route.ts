import { createHash } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { createRequestId, jsonError } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { toAppError } from "@/lib/errors/database";
import { createUserClient } from "@/lib/supabase/server";

const storedResponseSchema = z.object({ status: z.number(), body: z.unknown() }).nullable();

/** Stored bodies are plain JSON, so a round trip drops anything JSON cannot hold. */
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    throw new AppError("FORBIDDEN");
  }
}

/** Applies the checks every write needs: origin, rate limit and idempotency. */
export async function handleWrite(
  request: Request,
  fingerprint: string,
  run: () => Promise<unknown>,
  status = 200,
) {
  const requestId = createRequestId();
  try {
    assertSameOrigin(request);
    const key = request.headers.get("idempotency-key");
    if (!key)
      throw new AppError("VALIDATION_FAILED", { message: "Refresh the page and try again." });

    const supabase = await createUserClient();
    const { data: replay, error } = await supabase.rpc("api_begin", {
      p_key: key,
      p_route: `${request.method} ${new URL(request.url).pathname}`,
      p_hash: createHash("sha256").update(fingerprint).digest("hex"),
    });
    if (error) throw toAppError(error);
    const stored = storedResponseSchema.parse(replay);
    if (stored) return Response.json(stored.body, { status: stored.status });

    try {
      const body = { data: (await run()) ?? { done: true }, meta: { requestId } };
      await supabase.rpc("api_finish", { p_key: key, p_status: status, p_body: toJson(body) });
      return Response.json(body, { status });
    } catch (error) {
      await supabase.rpc("api_finish", { p_key: key, p_status: 500, p_body: null });
      throw error;
    }
  } catch (error) {
    return jsonError(error, requestId);
  }
}

/** Validates a JSON body, then runs it through the write checks. */
export async function handleJson<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  run: (input: z.output<Schema>) => Promise<unknown>,
  status = 200,
) {
  const text = await request.text();
  return handleWrite(
    request,
    text,
    async () => {
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        // An unreadable body fails validation below.
      }
      const input = schema.safeParse(json);
      if (!input.success) {
        const fields: Record<string, string> = {};
        for (const issue of input.error.issues) fields[issue.path.join(".")] ??= issue.message;
        throw new AppError("VALIDATION_FAILED", { fields });
      }
      return run(input.data);
    },
    status,
  );
}
