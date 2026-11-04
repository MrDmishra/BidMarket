import { createRequestId, jsonError } from "@/lib/api/response";
import { getOrderFileLink } from "@/modules/orders";

type Context = { params: Promise<{ id: string; kind: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id, kind } = await params;
    return Response.redirect(await getOrderFileLink(id, kind), 302);
  } catch (error) {
    return jsonError(error, createRequestId());
  }
}
