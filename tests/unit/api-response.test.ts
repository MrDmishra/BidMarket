import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";

afterEach(() => vi.restoreAllMocks());

describe("API envelopes", () => {
  it("wraps success data", async () => {
    const response = jsonOk({ value: 1 }, "req_1", { status: 201 });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { value: 1 }, meta: { requestId: "req_1" } });
  });

  it("returns a typed error with its fields", async () => {
    const response = jsonError(
      new AppError("BID_TOO_HIGH", { fields: { unitPaise: "Enter ₹604.96 or less." } }),
      "req_2",
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({
      code: "BID_TOO_HIGH",
      fields: { unitPaise: "Enter ₹604.96 or less." },
    });
  });

  it("hides unknown error details from the caller", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonError(new Error("database password rejected"), "req_3");
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(500);
    expect(body).toContain("INTERNAL_ERROR");
    expect(body).not.toContain("password");
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
