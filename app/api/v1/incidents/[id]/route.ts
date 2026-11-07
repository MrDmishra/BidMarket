import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { getIncident } from "@/modules/support";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const requestId = createRequestId();
  try {
    const { id } = await params;
    const record = await getIncident(id);
    if (!record) throw new AppError("NOT_FOUND");
    return jsonOk(record, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
