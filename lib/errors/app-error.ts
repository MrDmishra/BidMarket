import { ERROR_CATALOGUE, type ErrorCode } from "@/lib/errors/codes";

type AppErrorOptions = {
  message?: string;
  fields?: Record<string, string>;
  details?: Record<string, unknown>;
  cause?: unknown;
};

/** An error whose message and details are safe to show to the user. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? ERROR_CATALOGUE[code].message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_CATALOGUE[code].status;
    this.fields = options.fields;
    this.details = options.details;
  }
}
