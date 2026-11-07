import { handleJson } from "@/lib/api/route";
import { shortlistSchema, shortlistTender } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, shortlistSchema, (input) => shortlistTender(id, input.mode));
}
