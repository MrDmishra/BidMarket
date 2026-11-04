import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { logOut } from "@/modules/accounts/auth-actions";

export function AppHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-2.5">
        <Wordmark />
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 text-sm wrap-anywhere text-muted">{name}</span>
          <ThemeToggle />
          <form action={logOut}>
            <Button type="submit" variant="secondary" size="small">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
