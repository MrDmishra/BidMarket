import { handleJson } from "@/lib/api/route";
import { createOrganisation, organisationSchema } from "@/modules/accounts";

export function POST(request: Request) {
  return handleJson(request, organisationSchema, createOrganisation, 201);
}
