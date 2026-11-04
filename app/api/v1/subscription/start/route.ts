import { handleWrite } from "@/lib/api/route";
import { startSubscription } from "@/modules/billing";

export function POST(request: Request) {
  return handleWrite(request, "subscription-start", startSubscription, 201);
}
