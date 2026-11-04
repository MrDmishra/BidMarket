import { SkeletonRows } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <main className="page-wrap py-8">
      <SkeletonRows rows={6} label="Loading orders" />
    </main>
  );
}
