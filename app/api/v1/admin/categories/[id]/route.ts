import { handleJson } from "@/lib/api/route";
import { categorySchema, saveCategory } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, categorySchema, (input) => saveCategory(id, input));
}
