"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";

export function ReviewActions({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function review(approve: boolean) {
    setPending(true);
    setError("");
    const response = await fetch(`/api/v1/admin/organisations/${organisationId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, reason }),
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("Enter a reason of at least 3 characters, then try again.");
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <TextareaField
        id={`reason-${organisationId}`}
        label="Reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
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
