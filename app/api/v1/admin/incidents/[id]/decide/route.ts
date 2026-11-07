import { handleJson } from "@/lib/api/route";
import { decideIncident, decideSchema } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, decideSchema, (input) =>
    decideIncident(id, input.decision, input.close, input.reason),
  );
}
