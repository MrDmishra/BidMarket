import { AppError } from "@/lib/errors/app-error";
import { ERROR_CATALOGUE, type ErrorCode } from "@/lib/errors/codes";

/** Postgres functions raise catalogue codes as their message. Anything else stays internal. */
export function toAppError(error: { message: string }): AppError {
  const code = error.message in ERROR_CATALOGUE ? (error.message as ErrorCode) : "INTERNAL_ERROR";
  return new AppError(code, { cause: error });
}
