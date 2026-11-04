"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";

export function ProductReview({ productId }: { productId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function review(decision: string) {
    setPending(true);
    setError("");
    const response = await fetch(`/api/v1/admin/products/${productId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("Enter a note of at least 3 characters, then try again.");
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <TextareaField
        id={`note-${productId}`}
        label="Note to seller"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="small" disabled={pending} onClick={() => review("published")}>
          Publish
        </Button>
        <Button
          size="small"
          variant="secondary"
          disabled={pending}
          onClick={() => review("notify")}
        >
          Send back
        </Button>
        <Button size="small" variant="danger" disabled={pending} onClick={() => review("rejected")}>
          Reject
        </Button>
      </div>
    </div>
  );
}
