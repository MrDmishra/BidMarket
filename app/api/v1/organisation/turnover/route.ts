import { handleJson } from "@/lib/api/route";
import { saveTurnover, turnoverSchema } from "@/modules/accounts";

export function POST(request: Request) {
  return handleJson(request, turnoverSchema, saveTurnover);
}
