import { describe, expect, it } from "vitest";
import {
  addressSchema,
  bankAccountSchema,
  businessIdentitySchema,
  logInSchema,
  organisationSchema,
  reviewSchema,
  signUpSchema,
} from "@/modules/accounts/schemas";
import { toAppError } from "@/lib/errors/database";
import { recentFinancialYears } from "@/lib/time/financial-year";

const organisation = {
  kind: "buyer",
  entityType: "company",
  legalName: "Example Traders Pvt Ltd",
  acceptedTerms: true,
};

describe("account schemas", () => {
  it("rejects a bad email", () => {
    expect(logInSchema.safeParse({ email: "x", password: "y" }).success).toBe(false);
  });

  it("requires a long password and a match", () => {
    expect(
      signUpSchema.safeParse({ email: "a@b.co", password: "short", confirmPassword: "short" })
        .success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: "a@b.co",
        password: "long-enough-1",
        confirmPassword: "different-1",
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: "a@b.co",
        password: "long-enough-1",
        confirmPassword: "long-enough-1",
      }).success,
    ).toBe(true);
  });

  it("accepts a valid organisation and trims its name", () => {
    const result = organisationSchema.parse({ ...organisation, legalName: "  Example  " });
    expect(result.legalName).toBe("Example");
  });

  it("requires accepted terms", () => {
    expect(organisationSchema.safeParse({ ...organisation, acceptedTerms: false }).success).toBe(
      false,
    );
  });

  it("refuses individual sellers but allows individual buyers", () => {
    expect(
      organisationSchema.safeParse({ ...organisation, kind: "seller", entityType: "individual" })
        .success,
    ).toBe(false);
    expect(
      organisationSchema.safeParse({ ...organisation, entityType: "individual" }).success,
    ).toBe(true);
  });

  it("ignores a role sent by the client", () => {
    expect(organisationSchema.parse({ ...organisation, role: "admin" })).not.toHaveProperty("role");
  });
});

describe("toAppError", () => {
  it("keeps catalogue codes", () => {
    expect(toAppError({ message: "INVALID_STATE" }).code).toBe("INVALID_STATE");
  });

  it("hides anything else", () => {
    const error = toAppError({ message: 'relation "secret" does not exist' });
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).not.toContain("secret");
  });
});

describe("verification schemas", () => {
  it("normalises PAN and GSTIN to uppercase", () => {
    expect(businessIdentitySchema.parse({ pan: "aabcb1234f", gstin: "" }).pan).toBe("AABCB1234F");
  });

  it("rejects a bad GSTIN but allows it blank", () => {
    expect(businessIdentitySchema.safeParse({ pan: "AABCB1234F", gstin: "BAD" }).success).toBe(
      false,
    );
    expect(businessIdentitySchema.safeParse({ pan: "AABCB1234F", gstin: "" }).success).toBe(true);
  });

  it("checks bank details", () => {
    const valid = { holderName: "Org", accountNumber: "123456789012", ifsc: "hdfc0001234" };
    expect(bankAccountSchema.parse(valid).ifsc).toBe("HDFC0001234");
    expect(bankAccountSchema.safeParse({ ...valid, accountNumber: "12" }).success).toBe(false);
  });

  it("checks PIN codes", () => {
    const valid = {
      line1: "1 Road",
      line2: "",
      city: "Bhopal",
      stateCode: "23",
      pincode: "462001",
    };
    expect(addressSchema.safeParse(valid).success).toBe(true);
    expect(addressSchema.safeParse({ ...valid, pincode: "062001" }).success).toBe(false);
  });

  it("requires a reason for review decisions", () => {
    expect(reviewSchema.safeParse({ approve: true, reason: " " }).success).toBe(false);
  });
});

describe("recentFinancialYears", () => {
  it("lists completed years before April", () => {
    expect(recentFinancialYears(new Date(2027, 2, 31))).toEqual(["2025-26", "2024-25", "2023-24"]);
  });

  it("moves forward from April", () => {
    expect(recentFinancialYears(new Date(2026, 10, 4))).toEqual(["2025-26", "2024-25", "2023-24"]);
    expect(recentFinancialYears(new Date(2027, 3, 1))).toEqual(["2026-27", "2025-26", "2024-25"]);
  });
});
