import { z } from "zod";

export const CURRENT_POLICY_VERSION = "2026-11-draft";

const email = z.email("Enter an email address such as name@company.com.");
const newPassword = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use 72 characters or fewer.");

export const logInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({ email, password: newPassword, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export const organisationSchema = z
  .object({
    kind: z.enum(["buyer", "seller"]),
    entityType: z.enum([
      "individual",
      "proprietorship",
      "partnership",
      "trust_society",
      "llp",
      "company",
    ]),
    legalName: z
      .string()
      .trim()
      .min(2, "Enter your legal name.")
      .max(200, "Use 200 characters or fewer."),
    acceptedTerms: z.literal(true, { error: "Accept the terms to continue." }),
  })
  .refine((value) => value.kind !== "seller" || value.entityType !== "individual", {
    path: ["entityType"],
    message: "Individuals cannot sell. Choose a business type.",
  });

/** Returns the first message for each field, ready for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fields[key] ??= issue.message;
  }
  return fields;
}
