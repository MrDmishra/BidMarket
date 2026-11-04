import { handleJson } from "@/lib/api/route";
import { productSchema, saveProduct } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, productSchema, (input) => saveProduct(id, input));
}
