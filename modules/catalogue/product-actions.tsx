"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProductStatus } from "@/lib/supabase/database.types";

const FAILED: Record<string, string> = {
  submit: "Complete the required specifications, delivery states and stock, then try again.",
  publish: "We could not publish this. Refresh and try again.",
  unpublish: "We could not unpublish this. Refresh and try again.",
};

export function ProductActions({ id, status }: { id: string; status: ProductStatus }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const action =
    status === "draft" || status === "notify"
      ? { name: "submit", label: "Submit for review" }
      : status === "published"
        ? { name: "unpublish", label: "Unpublish" }
        : status === "unpublished"
          ? { name: "publish", label: "Publish" }
          : null;
  if (!action) return null;

  async function run(name: string) {
    setPending(true);
    setError("");
    const response = await fetch(`/api/v1/seller/products/${id}/${name}`, { method: "POST" }).catch(
      () => null,
    );
    setPending(false);
    if (response?.ok) router.refresh();
    else setError(FAILED[name] ?? "That did not work. Try again.");
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="small" variant="secondary" loading={pending} onClick={() => run(action.name)}>
        {action.label}
      </Button>
      {error ? <p className="text-sm font-medium text-bad">{error}</p> : null}
    </div>
  );
}
