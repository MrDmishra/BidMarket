import { createHmac, timingSafeEqual } from "node:crypto";

/** Compares in constant time, so a wrong signature reveals nothing about the right one. */
export function isValidRazorpaySignature(rawBody: string, signature: string, secret: string) {
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
