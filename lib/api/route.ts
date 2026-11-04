import type { z } from "zod";
import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";

/** Validates a JSON body and wraps the result in the API envelope. */
export async function handleJson<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  run: (input: z.output<Schema>) => Promise<unknown>,
  status = 200,
) {
  const requestId = createRequestId();
  try {
    const input = schema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      const fields: Record<string, string> = {};
      for (const issue of input.error.issues) fields[issue.path.join(".")] ??= issue.message;
      throw new AppError("VALIDATION_FAILED", { fields });
    }
    return jsonOk((await run(input.data)) ?? { done: true }, requestId, { status });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
