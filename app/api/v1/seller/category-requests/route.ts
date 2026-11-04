import { handleJson } from "@/lib/api/route";
import { categoryRequestSchema, requestCategory } from "@/modules/catalogue";

export function POST(request: Request) {
  return handleJson(request, categoryRequestSchema, requestCategory, 201);
}
