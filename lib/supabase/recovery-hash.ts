/** Reads the sign-in that a reset link puts after the # in the address. */
export function parseRecoveryHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (params.get("error") || !accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, isRecovery: params.get("type") === "recovery" };
}
