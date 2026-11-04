import { handleWrite } from "@/lib/api/route";
import { publishTender } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleWrite(request, id, () => publishTender(id));
}
