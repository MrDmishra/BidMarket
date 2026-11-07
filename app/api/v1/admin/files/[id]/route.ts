import { createRequestId, jsonError } from "@/lib/api/response";
import { getFileLinkForReview } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    return Response.redirect(await getFileLinkForReview(id), 302);
  } catch (error) {
    return jsonError(error, createRequestId());
  }
}
