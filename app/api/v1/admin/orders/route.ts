import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listOrders } from "@/modules/admin";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await listOrders(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
