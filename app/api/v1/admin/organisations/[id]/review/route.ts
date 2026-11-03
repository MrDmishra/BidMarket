import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { fieldErrors, reviewOrganisation, reviewSchema } from "@/modules/accounts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const requestId = createRequestId();
  try {
    const { id } = await params;
    const input = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      throw new AppError("VALIDATION_FAILED", { fields: fieldErrors(input.error) });
    }
    await reviewOrganisation(id, input.data.approve, input.data.reason);
    return jsonOk({ reviewed: true }, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
