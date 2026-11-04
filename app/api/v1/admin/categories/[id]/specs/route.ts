import { handleJson } from "@/lib/api/route";
import { addSpec, specSchema } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, specSchema, (input) => addSpec(id, input), 201);
}
