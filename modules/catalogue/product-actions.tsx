"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ProductStatus } from "@/lib/supabase/database.types";

const FAILED: Record<string, string> = {
  submit: "Complete the required specifications, delivery states and stock, then try again.",
  publish: "We could not publish this. Refresh and try again.",
  unpublish: "We could not unpublish this. Refresh and try again.",
};

type ProductActionsProps = { id: string; status: ProductStatus; canDelete: boolean };

export function ProductActions({ id, status, canDelete }: ProductActionsProps) {
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

  async function remove() {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/seller/products/${id}`, { method: "DELETE" }).catch(
      () => null,
    );
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("We could not delete this. Set stock to zero, then try again.");
  }

  async function run(name: string) {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/seller/products/${id}/${name}`).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError(FAILED[name] ?? "That did not work. Try again.");
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        {action ? (
          <Button
            size="small"
            variant="secondary"
            loading={pending}
            onClick={() => run(action.name)}
          >
            {action.label}
          </Button>
        ) : null}
        {canDelete ? (
          <ConfirmDialog
            triggerLabel="Delete"
            title="Delete this product?"
            consequence="This removes the product and its images permanently."
            confirmLabel="Delete product"
            onConfirm={remove}
          />
        ) : null}
      </div>
      {error ? <p className="text-sm font-medium text-bad">{error}</p> : null}
    </div>
  );
}
