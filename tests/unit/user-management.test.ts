import { describe, expect, it } from "vitest";
import {
  updateUserSchema,
  userAccessFilter,
  userAccessSchema,
  userRoleFilter,
} from "@/modules/admin/schemas";

describe("user management inputs", () => {
  it("needs a reason for every change", () => {
    expect(userAccessSchema.safeParse({ disable: true, reason: "" }).success).toBe(false);
    expect(userAccessSchema.safeParse({ disable: true, reason: "Fraud report" }).success).toBe(
      true,
    );
    expect(
      updateUserSchema.safeParse({ fullName: "Asha", designation: "", reason: "Typo" }).success,
    ).toBe(true);
  });

  it("never takes a password or a role", () => {
    expect(
      updateUserSchema.safeParse({ fullName: "A", designation: "", reason: "Fix", password: "x" })
        .success,
    ).toBe(false);
    expect(
      updateUserSchema.safeParse({ fullName: "A", designation: "", reason: "Fix", role: "admin" })
        .success,
    ).toBe(false);
  });

  it("ignores unknown filters instead of failing the page", () => {
    expect(userRoleFilter.parse("seller")).toBe("seller");
    expect(userRoleFilter.parse("owner")).toBeUndefined();
    expect(userAccessFilter.parse("disabled")).toBe("disabled");
    expect(userAccessFilter.parse("x")).toBeUndefined();
  });
});
