import { handleJson } from "@/lib/api/route";
import { dispatchOrder, dispatchSchema } from "@/modules/orders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, dispatchSchema, (input) => dispatchOrder(id, input));
}
