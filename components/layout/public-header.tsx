import { dashboardHref } from "@/components/layout/account-links";
import { MainNav } from "@/components/layout/main-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { findAccountKind } from "@/lib/auth/account";
import { logOut } from "@/modules/accounts/auth-actions";

export async function PublicHeader() {
  const kind = await findAccountKind();

  return (
    <header className="border-b border-line bg-surface">
      <div className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 sm:gap-x-5">
        <Wordmark />
        <form
          action="/products"
          role="search"
          className="order-last flex min-w-0 basis-full gap-0 sm:order-none sm:flex-1 sm:basis-60"
        >
          <input
            name="q"
            type="search"
            aria-label="Search products and categories"
            placeholder="Search products and categories"
            className="min-h-11 min-w-0 flex-1 rounded-l-control border border-r-0 border-line bg-surface px-3 placeholder:text-muted"
          />
          <Button type="submit" className="rounded-l-none">
            Search
          </Button>
        </form>
        <div className="ml-auto flex gap-2 sm:ml-0">
          {kind ? (
            <>
              <ButtonLink href={dashboardHref(kind)} size="small">
                {kind === "admin" ? "Admin" : "My dashboard"}
              </ButtonLink>
              <form action={logOut}>
                <Button type="submit" variant="secondary" size="small">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="secondary" size="small">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" size="small">
                Sign up
              </ButtonLink>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="page-wrap flex items-center gap-2">
          <MainNav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
