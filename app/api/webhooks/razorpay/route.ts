import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { handleRazorpayWebhook } from "@/modules/billing/webhook";

/** Reads the raw body first, because the signature covers the exact bytes Razorpay sent. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await handleRazorpayWebhook(
      rawBody,
      request.headers.get("x-razorpay-signature") ?? "",
      request.headers.get("x-razorpay-event-id") ?? "",
    );
    return Response.json({ result });
  } catch (error) {
    if (error instanceof AppError && error.code === "VALIDATION_FAILED") {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }
    logger.error("Razorpay webhook failed", { error });
    return Response.json({ error: "Not processed" }, { status: 500 });
  }
}
