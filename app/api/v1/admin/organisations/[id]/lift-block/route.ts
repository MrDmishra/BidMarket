import { handleJson } from "@/lib/api/route";
import { adminReasonSchema, liftBlock } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, adminReasonSchema, (input) => liftBlock(id, input.reason));
}
