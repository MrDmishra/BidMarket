import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextField } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { listUsers, USER_PAGE_SIZE, userAccessFilter, userRoleFilter } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "Users" };

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; access?: string; page?: string }>;
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  buyer: "Buyer",
  seller: "Seller",
  none: "Not set up yet",
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const account = await requireAdmin();
  const query = await searchParams;
  const role = userRoleFilter.parse(query.role);
  const access = userAccessFilter.parse(query.access);
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const { rows, total } = await listUsers({ search: query.q, role, access, page });
  const totalPages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const hrefFor = (number: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (role) params.set("role", role);
    if (access) params.set("access", access);
    params.set("page", String(number));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-4 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-sm text-muted">{total} logins match</p>
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get" role="search">
          <TextField
            id="user-search"
            name="q"
            label="Email, name or company"
            defaultValue={query.q ?? ""}
          />
          <SelectField id="user-role" name="role" label="Role" defaultValue={role ?? ""}>
            <option value="">Any</option>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField id="user-access" name="access" label="Login" defaultValue={access ?? ""}>
            <option value="">Any</option>
            <option value="active">Can log in</option>
            <option value="disabled">Turned off</option>
          </SelectField>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <DataTable
          caption="Newest first"
          rows={rows}
          rowKey={(row) => row.user_id}
          empty={<EmptyState message="No users match. Clear the search." />}
          columns={[
            {
              key: "user",
              header: "User",
              render: (row) => (
                <Link className="flex flex-col underline" href={`/admin/users/${row.user_id}`}>
                  <span className="wrap-anywhere">{row.email}</span>
                  {row.full_name ? (
                    <span className="text-sm text-muted no-underline">{row.full_name}</span>
                  ) : null}
                </Link>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (row) =>
                row.role === "admin"
                  ? "Admin"
                  : row.org_kind
                    ? ROLE_LABEL[row.org_kind]
                    : "Not set up yet",
            },
            { key: "org", header: "Organisation", render: (row) => row.org_name ?? "" },
            {
              key: "access",
              header: "Login",
              render: (row) => (
                <StatusPill
                  tone={row.disabled ? "bad" : "ok"}
                  label={row.disabled ? "Turned off" : "Can log in"}
                />
              ),
            },
            {
              key: "last",
              header: "Last sign-in",
              render: (row) => (row.last_sign_in_at ? shortDateTime(row.last_sign_in_at) : "Never"),
            },
          ]}
        />
        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} label="User pages" />
      </main>
    </>
  );
}
