import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listTickets } from "@/modules/admin";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await listTickets(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
