import { describe, expect, it } from "vitest";
import { fillPath } from "@/lib/fill-path";

describe("redirect paths after a create", () => {
  it("fills in the new record's id", () => {
    expect(fillPath("/support/tickets/:ticketId", { ticketId: "abc" })).toBe(
      "/support/tickets/abc",
    );
  });

  it("gives nothing when the reply lacks the id, so the page refreshes instead", () => {
    expect(fillPath("/support/tickets/:ticketId", {})).toBeNull();
    expect(fillPath("/support/tickets/:ticketId", null)).toBeNull();
  });
});
