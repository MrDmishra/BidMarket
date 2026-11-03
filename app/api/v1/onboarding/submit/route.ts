import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { submitOrganisation } from "@/modules/accounts";

export async function POST() {
  const requestId = createRequestId();
  try {
    return jsonOk(await submitOrganisation(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
