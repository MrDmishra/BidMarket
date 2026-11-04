import { handleJson } from "@/lib/api/route";
import { saveBusinessIdentity, businessIdentitySchema } from "@/modules/accounts";

export function POST(request: Request) {
  return handleJson(request, businessIdentitySchema, saveBusinessIdentity);
}
