import { AccountBadge } from "@/components/layout/account-badge";
import { ACCOUNT_LINKS } from "@/components/layout/account-links";
import { AccountNav } from "@/components/layout/account-nav";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { findAccountSummary } from "@/lib/auth/account";
import { logOut } from "@/modules/accounts/auth-actions";

/** `name` is shown only if the account cannot be read, such as during onboarding. */
export async function AppHeader({ name }: { name: string }) {
  const account = await findAccountSummary();

  return (
    <header className="border-b border-line bg-surface">
      <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-2.5">
        <Wordmark />
        <div className="flex min-w-0 items-center gap-3">
          {account ? (
            <AccountBadge account={account} />
          ) : (
            <span className="min-w-0 text-sm wrap-anywhere text-muted">{name}</span>
          )}
          <ThemeToggle />
          <form action={logOut}>
            <Button type="submit" variant="secondary" size="small">
              Log out
            </Button>
          </form>
        </div>
      </div>
      {account?.kind ? (
        <div className="border-t border-line">
          <div className="page-wrap flex items-center">
            <AccountNav links={ACCOUNT_LINKS[account.kind]} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
