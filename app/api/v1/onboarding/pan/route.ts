import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { fieldErrors, businessIdentitySchema, saveBusinessIdentity } from "@/modules/accounts";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const input = businessIdentitySchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      throw new AppError("VALIDATION_FAILED", { fields: fieldErrors(input.error) });
    }
    await saveBusinessIdentity(input.data);
    return jsonOk({ saved: true }, requestId, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
