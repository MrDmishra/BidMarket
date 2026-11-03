import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-3">
          <Wordmark />
          <nav aria-label="Account" className="flex gap-2">
            <ButtonLink href="/login" variant="secondary">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup">Sign up</ButtonLink>
          </nav>
        </div>
      </header>
      {children}
      <footer className="bg-band text-band-muted">
        <div className="page-wrap py-6 text-sm">© 2026 Bid Market</div>
      </footer>
    </>
  );
}
