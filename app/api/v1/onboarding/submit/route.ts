import { handleWrite } from "@/lib/api/route";
import { submitOrganisation } from "@/modules/accounts";

export function POST(request: Request) {
  return handleWrite(request, "submit", submitOrganisation);
}
