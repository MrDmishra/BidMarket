import { handleJson } from "@/lib/api/route";
import { addRegisteredAddress, addressSchema } from "@/modules/accounts";

export function POST(request: Request) {
  return handleJson(request, addressSchema, addRegisteredAddress);
}
