import { describe, expect, it } from "vitest";
import { logInSchema, organisationSchema, signUpSchema } from "@/modules/accounts/schemas";
import { toAppError } from "@/lib/errors/database";

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
