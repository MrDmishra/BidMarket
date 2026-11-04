import { handleJson } from "@/lib/api/route";
import { orderQuoteSchema, quoteOrder } from "@/modules/orders";

export function POST(request: Request) {
  return handleJson(request, orderQuoteSchema, quoteOrder);
}
