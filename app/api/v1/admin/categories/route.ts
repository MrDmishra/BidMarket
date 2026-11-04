import { handleJson } from "@/lib/api/route";
import { categorySchema, saveCategory } from "@/modules/catalogue";

export function POST(request: Request) {
  return handleJson(request, categorySchema, (input) => saveCategory(null, input), 201);
}
