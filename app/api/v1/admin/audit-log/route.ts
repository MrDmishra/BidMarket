import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { searchAuditLog } from "@/modules/admin";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const query = new URL(request.url).searchParams;
    return jsonOk(
      await searchAuditLog({
        entityType: query.get("entityType") ?? undefined,
        entityId: query.get("entityId") ?? undefined,
        action: query.get("action") ?? undefined,
        before: Number(query.get("before")) || undefined,
      }),
      requestId,
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
