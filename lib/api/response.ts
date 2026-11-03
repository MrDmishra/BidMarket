import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export function createRequestId() {
  return `req_${crypto.randomUUID()}`;
}

export function jsonOk<T>(data: T, requestId: string, init?: ResponseInit) {
  return Response.json({ data, meta: { requestId } }, init);
}

/** Unknown errors are logged in full, while the caller only receives a reference. */
export function jsonError(error: unknown, requestId: string) {
  const appError = error instanceof AppError ? error : new AppError("INTERNAL_ERROR");
  if (!(error instanceof AppError)) logger.error("Unhandled API error", { requestId, error });

  return Response.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.fields ? { fields: appError.fields } : {}),
        ...(appError.details ? { details: appError.details } : {}),
      },
      meta: { requestId },
    },
    { status: appError.status },
  );
}
