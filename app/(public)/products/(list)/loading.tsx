import { SkeletonRows } from "@/components/ui/skeleton";

// Kept beside the list only. A boundary above a detail page turns its 404 into a 200.
export default function ProductsLoading() {
  return (
    <main className="page-wrap py-8">
      <SkeletonRows rows={6} label="Loading products" />
    </main>
  );
}
