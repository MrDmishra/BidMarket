import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { getOverview } from "@/modules/admin";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await getOverview(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
