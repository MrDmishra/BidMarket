import "server-only";

import { getServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";

const TIMEOUT_MS = 10_000;

export function isEmailConfigured() {
  const env = getServerEnv();
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string) {
  const env = getServerEnv();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((cause: unknown) => {
    throw new AppError("PROVIDER_UNAVAILABLE", { cause });
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_UNAVAILABLE", { cause: new Error(`Resend ${response.status}`) });
  }
}
