import { handleJson } from "@/lib/api/route";
import { productSchema, saveProduct } from "@/modules/catalogue";

export function POST(request: Request) {
  return handleJson(request, productSchema, (input) => saveProduct(null, input), 201);
}
