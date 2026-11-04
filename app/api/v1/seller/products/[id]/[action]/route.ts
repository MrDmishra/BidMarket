import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { runProductAction } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string; action: string }> };

export async function POST(_request: Request, { params }: Context) {
  const requestId = createRequestId();
  try {
    const { id, action } = await params;
    if (action !== "submit" && action !== "publish" && action !== "unpublish") {
      throw new AppError("NOT_FOUND");
    }
    await runProductAction(id, action);
    return jsonOk({ done: true }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
