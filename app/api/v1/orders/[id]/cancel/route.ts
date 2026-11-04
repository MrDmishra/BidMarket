import { handleJson } from "@/lib/api/route";
import { cancelOrder, orderReasonSchema } from "@/modules/orders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, orderReasonSchema, (input) => cancelOrder(id, input.reason));
}
