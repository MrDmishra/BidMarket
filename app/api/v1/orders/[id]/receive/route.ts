import { handleJson } from "@/lib/api/route";
import { receiveOrder, receiveSchema } from "@/modules/orders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, receiveSchema, (input) => receiveOrder(id, input.fileId));
}
