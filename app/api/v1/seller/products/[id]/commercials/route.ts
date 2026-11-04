import { handleJson } from "@/lib/api/route";
import { commercialsSchema, updateCommercials } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, commercialsSchema, (input) => updateCommercials(id, input));
}
