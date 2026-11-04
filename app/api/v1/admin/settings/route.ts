import { handleJson } from "@/lib/api/route";
import { saveSettings, settingsSchema } from "@/modules/billing";

export function POST(request: Request) {
  return handleJson(request, settingsSchema, saveSettings, 201);
}
