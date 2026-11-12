/** Fills ":name" parts of a path from a reply, or gives null when a value is missing. */
export function fillPath(pattern: string, data: unknown): string | null {
  const values = (data ?? {}) as Record<string, unknown>;
  let missing = false;
  const path = pattern.replace(/:([A-Za-z]+)/g, (_match, key: string) => {
    const value = values[key];
    if (typeof value !== "string" || value === "") missing = true;
    return encodeURIComponent(String(value ?? ""));
  });
  return missing ? null : path;
}
