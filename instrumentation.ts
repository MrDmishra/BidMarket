export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ getServerEnv }, { initErrorTracking }] = await Promise.all([
    import("@/lib/env/server"),
    import("@/lib/providers/sentry"),
  ]);
  const env = getServerEnv();
  initErrorTracking(env.SENTRY_DSN, env.APP_ENV);
}

export async function onRequestError(
  ...args: Parameters<typeof import("@/lib/providers/sentry").captureRequestError>
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureRequestError } = await import("@/lib/providers/sentry");
  captureRequestError(...args);
}
