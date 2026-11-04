import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { getChargeStatus } from "@/modules/billing";

type Context = { params: Promise<{ chargeId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const requestId = createRequestId();
  try {
    const { chargeId } = await params;
    return jsonOk(await getChargeStatus(chargeId), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
