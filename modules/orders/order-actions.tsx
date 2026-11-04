"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { apiWrite } from "@/lib/api/client";

type Failure = { error?: { message?: string } };

async function failureMessage(response: Response | null) {
  const body = (await response?.json().catch(() => null)) as Failure | null;
  return body?.error?.message ?? "We could not do that. Try again.";
}

type OrderDecisionProps = {
  orderId: string;
  action: "reject" | "cancel";
  buttonLabel: string;
  reasonLabel: string;
};

export function OrderDecision({ orderId, action, buttonLabel, reasonLabel }: OrderDecisionProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/orders/${orderId}/${action}`, {
      json: { reason },
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError(await failureMessage(response));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <TextField
        id={`${action}-reason`}
        label={reasonLabel}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="button" variant="danger" disabled={pending} onClick={() => void submit()}>
        {buttonLabel}
      </Button>
    </div>
  );
}

export function AcceptOrder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/orders/${orderId}/accept`, { json: {} }).catch(
      () => null,
    );
    setPending(false);
    if (response?.ok) router.refresh();
    else setError(await failureMessage(response));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Button type="button" disabled={pending} onClick={() => void accept()}>
        Accept order
      </Button>
      <p className="text-sm text-muted">Accepting is binding. You pay your fee on the next step.</p>
    </div>
  );
}
