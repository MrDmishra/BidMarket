import { publicEnv } from "@/lib/env/public";

export function productImageUrl(path: string | null | undefined) {
  const base = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return undefined;
  return `${base}/storage/v1/object/public/product-images/${path}`;
}
