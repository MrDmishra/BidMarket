import Link from "next/link";
import { dashboardHref } from "@/components/layout/account-links";
import type { AccountSummary } from "@/lib/auth/account";

/** Who is signed in: their name, and their role with the login email. Opens their dashboard. */
export function AccountBadge({ account }: { account: AccountSummary }) {
  return (
    <Link
      href={dashboardHref(account.kind)}
      className="flex min-w-0 flex-col items-end leading-tight text-ink no-underline hover:underline"
      title="Open my dashboard"
    >
      <span className="max-w-[14rem] truncate text-sm font-semibold">{account.displayName}</span>
      <span className="max-w-[14rem] truncate text-xs text-muted">
        {account.roleLabel}
        {account.email ? <span className="hidden sm:inline"> · {account.email}</span> : null}
      </span>
    </Link>
  );
}
