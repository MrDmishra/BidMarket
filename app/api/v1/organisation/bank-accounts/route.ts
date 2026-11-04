import { handleJson } from "@/lib/api/route";
import { addBankAccount, bankAccountSchema } from "@/modules/accounts";

export function POST(request: Request) {
  return handleJson(request, bankAccountSchema, addBankAccount);
}
