import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pagination } from "@/components/ui/pagination";

const render = (page: number, totalPages: number) =>
  renderToStaticMarkup(
    createElement(Pagination, {
      page,
      totalPages,
      hrefFor: (n: number) => `/x?page=${n}`,
      label: "Pages",
    }),
  );

describe("pagination", () => {
  it("hides itself when everything fits on one page", () => {
    expect(render(1, 1)).toBe("");
  });

  it("marks the current page and links the others", () => {
    const html = render(2, 3);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/x?page=1"');
    expect(html).toContain('href="/x?page=3"');
    expect(html).toContain("Page 2 of 3");
  });

  it("shortens long runs of pages", () => {
    const html = render(5, 20);
    expect(html).toContain("…");
    expect(html).toContain('href="/x?page=20"');
    expect(html).not.toContain('href="/x?page=10"');
  });
});
