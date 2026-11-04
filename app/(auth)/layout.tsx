import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="page-wrap flex flex-col items-center gap-6 py-10">
      <div className="flex items-center gap-3">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col gap-4 rounded-panel border border-line bg-surface p-6">
        {children}
      </div>
    </main>
  );
}
