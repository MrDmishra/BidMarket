import { handleJson } from "@/lib/api/route";
import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listMyIncidents, raiseIncident, raiseIncidentSchema } from "@/modules/support";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await listMyIncidents(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: Request) {
  return handleJson(request, raiseIncidentSchema, (input) => raiseIncident(input), 201);
}
