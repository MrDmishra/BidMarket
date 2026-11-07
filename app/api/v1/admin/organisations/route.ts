import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listOrganisations, orgStatusFilter } from "@/modules/admin";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const query = new URL(request.url).searchParams;
    return jsonOk(
      await listOrganisations(
        query.get("q") ?? "",
        orgStatusFilter.parse(query.get("status") ?? undefined),
      ),
      requestId,
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}
