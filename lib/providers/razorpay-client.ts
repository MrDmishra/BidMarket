import "server-only";

import { z } from "zod";
import { getServerEnv } from "@/lib/env/server";
import { AppError } from "@/lib/errors/app-error";
import { publicEnv } from "@/lib/env/public";

const API_URL = "https://api.razorpay.com/v1";
const TIMEOUT_MS = 10_000;

const orderSchema = z.object({ id: z.string() });
const orderPaymentsSchema = z.object({
  items: z.array(z.object({ id: z.string(), status: z.string(), amount: z.number() })),
});

export function isRazorpayConfigured() {
  return Boolean(publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID && getServerEnv().RAZORPAY_KEY_SECRET);
}

async function razorpayRequest(path: string, init?: RequestInit) {
  const keyId = publicEnv.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = getServerEnv().RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError("PROVIDER_UNAVAILABLE");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((cause: unknown) => {
    throw new AppError("PROVIDER_UNAVAILABLE", { cause });
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_UNAVAILABLE", { cause: new Error(`Razorpay ${response.status}`) });
  }
  return response.json() as Promise<unknown>;
}

export async function createRazorpayOrder(amountPaise: number, paymentId: string) {
  const body = JSON.stringify({
    amount: amountPaise,
    currency: "INR",
    receipt: paymentId.replaceAll("-", "").slice(0, 40),
    notes: { paymentId },
  });
  const order = orderSchema.parse(await razorpayRequest("/orders", { method: "POST", body }));
  return order.id;
}

export async function findCapturedPayment(orderId: string) {
  const { items } = orderPaymentsSchema.parse(await razorpayRequest(`/orders/${orderId}/payments`));
  return items.find((item) => item.status === "captured") ?? null;
}
