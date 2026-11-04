/** Sends one write with a fresh key, so a repeated click or retry cannot apply twice. */
export function apiWrite(
  url: string,
  options: { method?: string; json?: unknown; form?: FormData } = {},
) {
  const headers: Record<string, string> = { "Idempotency-Key": crypto.randomUUID() };
  if (options.json !== undefined) headers["Content-Type"] = "application/json";
  return fetch(url, {
    method: options.method ?? "POST",
    headers,
    body: options.form ?? (options.json === undefined ? undefined : JSON.stringify(options.json)),
  });
}
