import { z } from "zod";

const description = z
  .string()
  .trim()
  .min(10, "Describe the problem in at least 10 characters.")
  .max(2000, "Keep it under 2,000 characters.");

export const raiseIncidentSchema = z
  .strictObject({
    orderId: z.uuid().optional(),
    tenderId: z.uuid().optional(),
    productId: z.uuid().optional(),
    description,
  })
  .refine(
    (value) => [value.orderId, value.tenderId, value.productId].filter(Boolean).length === 1,
    {
      message: "Raise an incident from the order, tender or product it is about.",
      path: ["description"],
    },
  );

export const TICKET_TYPES = [
  "account",
  "payment",
  "tender",
  "order",
  "technical",
  "other",
] as const;

export const raiseTicketSchema = z.strictObject({
  type: z.enum(TICKET_TYPES, "Choose what this is about."),
  subcategory: z.string().trim().max(80, "Keep the topic short.").optional(),
  description,
});

export const messageSchema = z.strictObject({
  body: z.string().trim().min(1, "Write a message.").max(2000, "Keep it under 2,000 characters."),
});

const threadMessage = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: z.enum(["you", "your_team", "other_party", "support"]),
});

export const incidentSchema = z.object({
  id: z.string(),
  refNo: z.string(),
  status: z.enum(["open", "decided", "closed"]),
  role: z.enum(["raiser", "other_party", "support"]),
  description: z.string(),
  decision: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
  orderId: z.string().nullable(),
  tenderId: z.string().nullable(),
  productId: z.string().nullable(),
  reference: z.string().nullable(),
  raisedBy: z.string().nullable(),
  against: z.string().nullable(),
  messages: z.array(threadMessage),
});
export type Incident = z.infer<typeof incidentSchema>;

export const ticketSchema = z.object({
  id: z.string(),
  refNo: z.string(),
  type: z.enum(TICKET_TYPES),
  subcategory: z.string().nullable(),
  status: z.enum(["open", "resolved"]),
  description: z.string(),
  resolution: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  raisedBy: z.string().nullable(),
  messages: z.array(threadMessage),
});
export type Ticket = z.infer<typeof ticketSchema>;
export type ThreadAuthor = z.infer<typeof threadMessage>["author"];
