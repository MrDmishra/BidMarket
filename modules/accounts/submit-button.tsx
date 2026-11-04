"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";

export function SubmitVerificationButton({ ready }: { ready: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError("");
    const response = await apiWrite("/api/v1/onboarding/submit").catch(() => null);
    if (response?.ok) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    setError("We could not submit your details. Check each section, then try again.");
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Button onClick={submit} loading={pending} disabled={!ready}>
        Submit for verification
      </Button>
    </div>
  );
}
