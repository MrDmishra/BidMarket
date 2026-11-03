import * as Sentry from "@sentry/nextjs";
import { sanitize } from "@/lib/logger";

export function initErrorTracking(dsn: string | undefined, environment: string) {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    // The SDK collects all of these by default. None may leave the server.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0,
    beforeSend: (event) => sanitize(event) as typeof event,
  });
}

export const captureRequestError = Sentry.captureRequestError;
