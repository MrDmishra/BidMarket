type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY =
  /password|secret|token|authorization|cookie|aadhaar|api_?key|^otp$|^pan$|^pan_|account_?(no|number)/i;
const PAN_VALUE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
const AADHAAR_VALUE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const MAX_DEPTH = 6;

/** Removes secrets and identity values so they can never reach log storage. */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (typeof value === "string") {
    return value.replace(PAN_VALUE, "[REDACTED]").replace(AADHAAR_VALUE, "[REDACTED]");
  }
  if (value instanceof Error) {
    return { name: value.name, message: sanitize(value.message, depth + 1) };
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitize(item, depth + 1),
      ]),
    );
  }
  return value;
}

function write(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  const entry = JSON.stringify({
    level,
    message: sanitize(message),
    time: new Date().toISOString(),
    ...(sanitize(context) as Record<string, unknown>),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
