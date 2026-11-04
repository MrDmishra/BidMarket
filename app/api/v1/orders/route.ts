import { handleJson } from "@/lib/api/route";
import { createOrder, createOrderSchema } from "@/modules/orders";

export function POST(request: Request) {
  return handleJson(request, createOrderSchema, createOrder, 201);
}
