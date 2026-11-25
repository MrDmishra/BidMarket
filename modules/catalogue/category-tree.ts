type TreeInput = { id: string; parent_id: string | null };

export function groupCategories<Category extends TreeInput>(categories: Category[]) {
  return categories
    .filter((category) => !category.parent_id)
    .map((category) => ({
      ...category,
      subCategories: categories.filter((item) => item.parent_id === category.id),
    }));
}

export function specCategoryIds<Category extends TreeInput>(
  categories: Category[],
  categoryId: string,
) {
  const parentId = categories.find((item) => item.id === categoryId)?.parent_id;
  return parentId ? [categoryId, parentId] : [categoryId];
}

/**
 * Ranks categories by how many of the given products sit in them. The products arrive most-ordered
 * first, so a category full of popular products ranks above one with a single listing.
 */
export function rankPopularCategories<Category extends { slug: string; name: string }>(
  categories: Category[],
  products: { category_slug: string }[],
  limit: number,
) {
  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.category_slug, (counts.get(product.category_slug) ?? 0) + 1);
  }
  return categories
    .filter((category) => counts.has(category.slug))
    .map((category) => ({ ...category, productCount: counts.get(category.slug) ?? 0 }))
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}
