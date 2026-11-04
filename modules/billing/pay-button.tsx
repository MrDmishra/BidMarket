"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const POLL_MS = 3_000;
const POLL_ATTEMPTS = 20;

type RazorpayCheckout = { open: () => void };
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  order_id: string;
  handler: () => void;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

type Checkout = { status: string; orderId?: string; amountPaise?: number; keyId?: string };
type Stage = "idle" | "working" | "confirming" | "delayed";

function loadCheckoutScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Checkout did not load"));
    document.body.append(script);
  });
}

async function postJson<Result>(path: string) {
  const response = await apiWrite(path, { json: {} });
  const body = (await response.json().catch(() => null)) as {
    data?: Result;
    error?: { message?: string };
  } | null;
  if (!response.ok || !body?.data) {
    throw new Error(body?.error?.message ?? "We could not start the payment. Try again.");
  }
  return body.data;
}

type PayButtonProps = { chargeId?: string; label: string };

/** Razorpay's success callback only starts polling. The webhook decides when a payment is paid. */
export function PayButton({ chargeId, label }: PayButtonProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  async function waitForConfirmation(id: string) {
    setStage("confirming");
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      const response = await fetch(`/api/v1/payments/${id}`).catch(() => null);
      const body = (await response?.json().catch(() => null)) as {
        data?: { status?: string };
      } | null;
      if (body?.data?.status === "paid") {
        router.refresh();
        return;
      }
    }
    setStage("delayed");
  }

  async function pay() {
    setStage("working");
    setError("");
    try {
      const id =
        chargeId ?? (await postJson<{ chargeId: string }>("/api/v1/subscription/start")).chargeId;
      const checkout = await postJson<Checkout>(`/api/v1/payments/${id}/checkout`);
      if (checkout.status !== "pending") {
        setStage("idle");
        router.refresh();
        return;
      }
      await loadCheckoutScript();
      if (!window.Razorpay || !checkout.keyId || !checkout.orderId || !checkout.amountPaise) {
        throw new Error("We could not open the payment page. Try again.");
      }
      new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amountPaise,
        currency: "INR",
        name: "Bid Market",
        order_id: checkout.orderId,
        handler: () => void waitForConfirmation(id),
        modal: { ondismiss: () => setStage("idle") },
      }).open();
    } catch (cause) {
      setStage("idle");
      setError(cause instanceof Error ? cause.message : "We could not start the payment.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {stage === "confirming" ? <Banner>Confirming your payment. Please wait.</Banner> : null}
      {stage === "delayed" ? (
        <Banner>
          Your bank is taking longer than usual. You can close this page. Your account updates once
          the payment is confirmed.
        </Banner>
      ) : null}
      {stage === "idle" || stage === "working" ? (
        <Button type="button" onClick={() => void pay()} disabled={stage === "working"}>
          {stage === "working" ? "Opening payment…" : label}
        </Button>
      ) : null}
    </div>
  );
}
