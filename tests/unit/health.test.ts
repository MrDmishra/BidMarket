import { describe, expect, it, vi } from "vitest";
import { checkHealth } from "@/lib/health/check";

const configured = { supabaseUrl: "https://project.supabase.co", publishableKey: "key" };

describe("checkHealth", () => {
  it("reports not_configured without calling Supabase", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(checkHealth({ fetchImpl })).resolves.toEqual({
      status: "ok",
      app: "ok",
      supabase: "not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports ok when Supabase responds", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    const report = await checkHealth({ ...configured, fetchImpl });
    expect(report).toMatchObject({ status: "ok", supabase: "ok" });
  });

  it("degrades on an error response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 500 }));
    const report = await checkHealth({ ...configured, fetchImpl });
    expect(report).toMatchObject({ status: "degraded", supabase: "unavailable" });
  });

  it("degrades on a network failure", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"));
    const report = await checkHealth({ ...configured, fetchImpl });
    expect(report).toMatchObject({ status: "degraded", supabase: "unavailable" });
  });
});
