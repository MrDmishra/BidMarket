import { describe, expect, it } from "vitest";
import {
  groupCategories,
  rankPopularCategories,
  specCategoryIds,
} from "@/modules/catalogue/category-tree";

const categories = [
  { id: "furniture", parent_id: null },
  { id: "tables", parent_id: "furniture" },
  { id: "food", parent_id: null },
  { id: "seating", parent_id: "furniture" },
];

describe("groupCategories", () => {
  it("places each sub-category under its main category, in order", () => {
    const [furniture, food] = groupCategories(categories);
    expect(furniture?.subCategories.map((item) => item.id)).toEqual(["tables", "seating"]);
    expect(food?.subCategories).toEqual([]);
  });

  it("does not list a sub-category as a main category", () => {
    expect(groupCategories(categories).map((item) => item.id)).toEqual(["furniture", "food"]);
  });
});

describe("specCategoryIds", () => {
  it("includes the main category for a sub-category", () => {
    expect(specCategoryIds(categories, "tables")).toEqual(["tables", "furniture"]);
  });

  it("returns only the category itself for a main category", () => {
    expect(specCategoryIds(categories, "food")).toEqual(["food"]);
  });
});

describe("rankPopularCategories", () => {
  const subCategories = [
    { slug: "cables", name: "Cables" },
    { slug: "chairs", name: "Chairs" },
    { slug: "almirah", name: "Almirah" },
    { slug: "empty", name: "Empty" },
  ];
  const products = [
    { category_slug: "chairs" },
    { category_slug: "cables" },
    { category_slug: "chairs" },
    { category_slug: "almirah" },
  ];

  it("puts the category with the most products first and leaves out empty ones", () => {
    expect(rankPopularCategories(subCategories, products, 10)).toEqual([
      { slug: "chairs", name: "Chairs", productCount: 2 },
      { slug: "almirah", name: "Almirah", productCount: 1 },
      { slug: "cables", name: "Cables", productCount: 1 },
    ]);
  });

  it("stops at the limit", () => {
    expect(rankPopularCategories(subCategories, products, 1)).toHaveLength(1);
  });
});
