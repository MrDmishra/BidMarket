import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listUsers, userAccessFilter, userRoleFilter } from "@/modules/admin";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const query = new URL(request.url).searchParams;
    return jsonOk(
      await listUsers({
        search: query.get("q") ?? undefined,
        role: userRoleFilter.parse(query.get("role") ?? undefined),
        access: userAccessFilter.parse(query.get("access") ?? undefined),
        page: Math.max(1, Math.floor(Number(query.get("page"))) || 1),
      }),
      requestId,
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
