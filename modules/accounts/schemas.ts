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

export const businessIdentitySchema = z.object({
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{5}\d{4}[A-Z]$/, "PAN has 10 characters, such as AAAAA0000A."),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^(\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z])?$/,
      "GSTIN has 15 characters, such as 22AAAAA0000A1Z5.",
    ),
});

export const addressSchema = z.object({
  line1: z.string().trim().min(3, "Enter the address.").max(200, "Use 200 characters or fewer."),
  line2: z.string().trim().max(200, "Use 200 characters or fewer."),
  city: z.string().trim().min(2, "Enter the city.").max(100, "Use 100 characters or fewer."),
  stateCode: z.string().regex(/^\d{2}$/, "Choose a state."),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "PIN code has 6 digits."),
});

export const bankAccountSchema = z.object({
  holderName: z
    .string()
    .trim()
    .min(2, "Enter the account holder's name.")
    .max(200, "Use 200 characters or fewer."),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, "Account number has 9 to 18 digits."),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC has 11 characters, such as HDFC0001234."),
});

const rupees = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 12500000.");

export const turnoverSchema = z.object({ year1: rupees, year2: rupees, year3: rupees });

export const reviewSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().min(3, "Enter a reason.").max(500, "Use 500 characters or fewer."),
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
