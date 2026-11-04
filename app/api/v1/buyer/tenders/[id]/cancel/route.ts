import { handleJson } from "@/lib/api/route";
import { cancelTender, reasonSchema } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, reasonSchema, (input) => cancelTender(id, input.reason));
}
