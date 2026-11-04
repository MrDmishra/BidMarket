import { handleJson } from "@/lib/api/route";
import { awardSchema, awardTender } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, awardSchema, (input) => awardTender(id, input.rank));
}
