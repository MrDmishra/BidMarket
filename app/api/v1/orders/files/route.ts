import { handleWrite } from "@/lib/api/route";
import { getAccount } from "@/lib/auth/account";
import { AppError } from "@/lib/errors/app-error";
import { uploadOrderFile } from "@/modules/orders";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const fingerprint = file instanceof File ? `${file.name}:${file.size}` : "missing";
  return handleWrite(
    request,
    fingerprint,
    async () => {
      if (!(file instanceof File)) {
        throw new AppError("VALIDATION_FAILED", { fields: { file: "Choose a file." } });
      }
      const account = await getAccount();
      if (!account?.organisation) throw new AppError("FORBIDDEN");
      // Delivery photos must be images, while sellers may upload bills as PDFs.
      return uploadOrderFile(file, account.organisation.kind === "seller", account.organisation.id);
    },
    201,
  );
}
