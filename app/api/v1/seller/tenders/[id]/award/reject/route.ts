import { handleJson } from "@/lib/api/route";
import { reasonSchema, rejectAward } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, reasonSchema, (input) => rejectAward(id, input.reason));
}
