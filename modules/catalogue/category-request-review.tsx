"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { apiWrite } from "@/lib/api/client";

export function CategoryRequestReview({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function review(approve: boolean) {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/admin/category-requests/${requestId}/review`, {
      json: { approve, note },
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("Enter a note of at least 3 characters, then try again.");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <TextField
        id={`category-note-${requestId}`}
        label="Note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="small" disabled={pending} onClick={() => review(true)}>
          Approve
        </Button>
        <Button size="small" variant="danger" disabled={pending} onClick={() => review(false)}>
          Reject
        </Button>
      </div>
    </div>
  );
}
