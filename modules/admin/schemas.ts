import { z } from "zod";

const reason = z
  .string()
  .trim()
  .min(3, "Give a reason. It is saved in the audit log.")
  .max(500, "Keep the reason under 500 characters.");

export const adminReasonSchema = z.strictObject({ reason });
export const fileReviewSchema = z.strictObject({ clean: z.boolean(), reason });
export const blockSchema = z.strictObject({
  days: z
    .number()
    .int("Enter whole days.")
    .min(1, "Enter 1 to 3,650 days, or leave it empty to block permanently.")
    .max(3650, "Enter 1 to 3,650 days, or leave it empty to block permanently.")
    .nullable(),
  reason,
});
export const decideSchema = z.strictObject({
  decision: z.string().trim().min(3, "Write the decision.").max(2000),
  close: z.boolean(),
  reason,
});
export const resolveSchema = z.strictObject({
  resolution: z.string().trim().min(3, "Write how it was resolved.").max(2000),
  reason,
});

export const overviewSchema = z.object({
  pendingOrganisations: z.number(),
  pendingProducts: z.number(),
  categoryRequests: z.number(),
  openIncidents: z.number(),
  openTickets: z.number(),
  liveAuctions: z.number(),
  pausedAuctions: z.number(),
  openTenders: z.number(),
  activeOrders: z.number(),
  blockedSellers: z.number(),
  feesPaidPaise: z.number(),
});
export type Overview = z.infer<typeof overviewSchema>;

export const organisationDetailSchema = z.object({
  id: z.string(),
  legalName: z.string(),
  kind: z.enum(["buyer", "seller"]),
  entityType: z.string(),
  status: z.string(),
  gstin: z.string().nullable(),
  strikeCount: z.number(),
  blockedUntil: z.string().nullable(),
  maintenance: z.boolean(),
  createdAt: z.string(),
  users: z.array(z.object({ email: z.string().nullable() })),
  penalties: z.array(
    z.object({
      id: z.string(),
      strikeNo: z.number().nullable(),
      days: z.number().nullable(),
      endsAt: z.string(),
      reason: z.string(),
      waivedAt: z.string().nullable(),
      waivedReason: z.string().nullable(),
    }),
  ),
});
export type OrganisationDetail = z.infer<typeof organisationDetailSchema>;

export const orgStatusFilter = z
  .enum(["draft", "pending_payment", "pending_review", "active", "suspended", "rejected"])
  .optional()
  .catch(undefined);

export const adminProductSchema = z.object({
  status: z.string(),
  reviewNote: z.string().nullable(),
  sellerOrgId: z.string(),
  sellerName: z.string(),
  sellerStatus: z.string(),
});
export type AdminProduct = z.infer<typeof adminProductSchema>;

export const updateUserSchema = z.strictObject({
  fullName: z.string().trim().max(120, "Keep the name under 120 characters."),
  designation: z.string().trim().max(120, "Keep the job title under 120 characters."),
  reason,
});
export const userAccessSchema = z.strictObject({ disable: z.boolean(), reason });

export const adminUserSchema = z.object({
  userId: z.string(),
  email: z.string().nullable(),
  fullName: z.string().nullable(),
  designation: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(["org_user", "admin"]),
  createdAt: z.string(),
  lastSignInAt: z.string().nullable(),
  emailConfirmed: z.boolean(),
  disabled: z.boolean(),
  isSelf: z.boolean(),
  sessions: z.number(),
  organisation: z
    .object({ id: z.string(), legalName: z.string(), kind: z.string(), status: z.string() })
    .nullable(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const USER_ROLE_FILTERS = ["admin", "buyer", "seller", "none"] as const;
export const userRoleFilter = z.enum(USER_ROLE_FILTERS).optional().catch(undefined);
export const userAccessFilter = z.enum(["active", "disabled"]).optional().catch(undefined);
