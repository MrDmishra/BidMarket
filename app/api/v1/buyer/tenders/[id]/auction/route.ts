import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { getBuyerAuction } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const requestId = createRequestId();
  try {
    const { id } = await params;
    return jsonOk(await getBuyerAuction(id), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
