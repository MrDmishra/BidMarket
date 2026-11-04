import { z } from "zod";
import { rupeesToPaise } from "@/lib/money";

const MIN_DISCOUNT_PERCENT = 10;

const amount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 1250 or 1250.50.")
  .transform(rupeesToPaise)
  .refine((paise) => paise > 0, "Enter more than zero.");

const discount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a percentage such as 15.")
  .transform(rupeesToPaise)
  .refine(
    (bps) => bps >= MIN_DISCOUNT_PERCENT * 100 && bps <= 9000,
    `Offer between ${MIN_DISCOUNT_PERCENT}% and 90% off MRP.`,
  );

const stock = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,3})?$/, "Enter a quantity such as 100.")
  .transform(Number);

export const productSchema = z.object({
  categoryId: z.uuid("Choose a category."),
  title: z
    .string()
    .trim()
    .min(3, "Enter a product title.")
    .max(200, "Use 200 characters or fewer."),
  description: z.string().trim().max(2000, "Use 2,000 characters or fewer.").default(""),
  mrp: amount,
  discount,
  stock,
  unit: z
    .string()
    .trim()
    .min(1, "Enter a unit such as pc or kg.")
    .max(20, "Use 20 characters or fewer."),
  states: z.array(z.string().regex(/^\d{2}$/)).min(1, "Choose at least one state."),
  specs: z.record(z.uuid(), z.string().trim().max(200)).default({}),
});

export const commercialsSchema = z.object({ mrp: amount, discount, stock });

export const productReviewSchema = z.object({
  decision: z.enum(["published", "notify", "rejected"]),
  note: z.string().trim().min(3, "Enter a note of at least 3 characters."),
});

export const testActivationSchema = z.object({
  reason: z.string().trim().min(3, "Enter a reason of at least 3 characters."),
});

export const categoryRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(100, "Use 100 characters or fewer."),
  details: z
    .string()
    .trim()
    .min(5, "Say what this category would hold.")
    .max(1000, "Use 1,000 characters or fewer."),
});

export const categoryRequestReviewSchema = z.object({
  approve: z.boolean(),
  note: z.string().trim().min(3, "Enter a note of at least 3 characters."),
});

const yesNo = z
  .enum(["yes", "no"], { error: "Choose yes or no." })
  .transform((value) => value === "yes");

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100, "Use 100 characters or fewer."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens."),
  description: z.string().trim().max(300, "Use 300 characters or fewer.").default(""),
  parentId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable().default(null),
  ),
  isActive: yesNo,
  sortOrder: z.coerce
    .number("Enter a number.")
    .int("Enter a whole number.")
    .min(0, "Enter 0 or more."),
});

export const specSchema = z.object({
  label: z.string().trim().min(2, "Enter a label.").max(60, "Use 60 characters or fewer."),
  kind: z.enum(["text", "number"], { error: "Choose a type." }),
  unit: z.string().trim().max(20, "Use 20 characters or fewer.").default(""),
  isKey: yesNo,
  isRequired: yesNo,
});
