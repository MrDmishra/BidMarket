import "server-only";

export function serverNowMs(): number {
  return Date.now();
}
