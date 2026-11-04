import { handleJson, handleWrite } from "@/lib/api/route";
import { bidSchema, submitBid, withdrawBid } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, bidSchema, (input) => submitBid(id, input.unitPrice), 201);
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params;
  return handleWrite(request, id, () => withdrawBid(id));
}
