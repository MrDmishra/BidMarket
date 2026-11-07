import { handleJson } from "@/lib/api/route";
import { addIncidentMessage, messageSchema } from "@/modules/support";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, messageSchema, (input) => addIncidentMessage(id, input.body));
}
