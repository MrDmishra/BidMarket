import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { createOrganisation, fieldErrors, organisationSchema } from "@/modules/accounts";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const input = organisationSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      throw new AppError("VALIDATION_FAILED", { fields: fieldErrors(input.error) });
    }
    return jsonOk(await createOrganisation(input.data), requestId, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
