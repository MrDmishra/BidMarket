import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listTenders } from "@/modules/admin";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await listTenders(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
