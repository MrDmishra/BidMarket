import { handleJson } from "@/lib/api/route";
import { createRequestId, jsonError, jsonOk } from "@/lib/api/response";
import { listMyTickets, raiseTicket, raiseTicketSchema } from "@/modules/support";

export async function GET() {
  const requestId = createRequestId();
  try {
    return jsonOk(await listMyTickets(), requestId);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(request: Request) {
  return handleJson(request, raiseTicketSchema, (input) => raiseTicket(input), 201);
}
