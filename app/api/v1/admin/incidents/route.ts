import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listIncidents } from "@/modules/admin";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await listIncidents(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
