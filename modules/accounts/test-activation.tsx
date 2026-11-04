"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";
import { TextField } from "@/components/ui/field";

export function TestActivation({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function activate() {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/admin/organisations/${organisationId}/test-activate`, {
      json: { reason },
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("Enter a reason of at least 3 characters, then try again.");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <TextField
        id={`activate-${organisationId}`}
        label="Reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button size="small" variant="secondary" loading={pending} onClick={activate}>
        Activate for testing
      </Button>
    </div>
  );
}
