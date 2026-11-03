import type { ReactNode } from "react";

// These pages depend on the signed-in user, so they can never be prerendered.
export const dynamic = "force-dynamic";

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return children;
}
