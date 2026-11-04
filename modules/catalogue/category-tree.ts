type TreeInput = { id: string; parent_id: string | null };

export function groupCategories<Category extends TreeInput>(categories: Category[]) {
  return categories
    .filter((category) => !category.parent_id)
    .map((category) => ({
      ...category,
      subCategories: categories.filter((item) => item.parent_id === category.id),
    }));
}
