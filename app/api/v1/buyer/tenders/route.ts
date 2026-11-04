import { handleJson } from "@/lib/api/route";
import { createTender, createTenderSchema } from "@/modules/tenders";

export function POST(request: Request) {
  return handleJson(request, createTenderSchema, createTender, 201);
}
