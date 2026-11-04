import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.url().optional());

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalText,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalText,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: optionalText,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

const REQUIRED_IN_PRODUCTION = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export const serverEnvSchema = publicEnvSchema
  .extend({
    APP_ENV: z.enum(["local", "preview", "production"]).default("local"),
    SENTRY_DSN: optionalUrl,
    SUPABASE_SERVICE_ROLE_KEY: optionalText,
    RAZORPAY_KEY_SECRET: optionalText,
    RAZORPAY_WEBHOOK_SECRET: optionalText,
    RAZORPAY_WEBHOOK_SECRET_PREVIOUS: optionalText,
    INTERNAL_JOB_SECRET: optionalText,
    RESEND_API_KEY: optionalText,
    EMAIL_FROM: optionalText,
  })
  .superRefine((env, context) => {
    if (env.APP_ENV !== "production") return;
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!env[key]) {
        context.addIssue({ code: "custom", path: [key], message: "Required in production" });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Reports variable names only, so a bad secret value can never reach the logs. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (result.success) return result.data;
  const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment variables: ${names}`);
}
