import { handleJson } from "@/lib/api/route";
import { blockOrganisation, blockSchema } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, blockSchema, (input) =>
    blockOrganisation(id, input.days, input.reason),
  );
}
