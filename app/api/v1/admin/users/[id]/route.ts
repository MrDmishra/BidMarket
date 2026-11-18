import { handleJson } from "@/lib/api/route";
import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors/app-error";
import { getUser, updateUser, updateUserSchema } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const requestId = createRequestId();
  try {
    const { id } = await params;
    const user = await getUser(id);
    if (!user) throw new AppError("NOT_FOUND");
    return jsonOk(user, requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, updateUserSchema, (input) =>
    updateUser(id, input.fullName, input.designation, input.reason),
  );
}
