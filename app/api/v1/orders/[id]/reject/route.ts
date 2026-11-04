import { handleJson } from "@/lib/api/route";
import { rejectOrder, orderReasonSchema } from "@/modules/orders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, orderReasonSchema, (input) => rejectOrder(id, input.reason));
}
