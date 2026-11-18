import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ActionForm } from "@/components/ui/action-form";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { FactList } from "@/components/ui/fact-list";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdmin } from "@/lib/auth/account";
import { ApiForm } from "@/modules/accounts/api-form";
import { getUser } from "@/modules/admin";
import { shortDateTime } from "@/modules/support";

export const metadata: Metadata = { title: "User" };

type PageProps = { params: Promise<{ id: string }> };

const REASON = {
  kind: "textarea",
  name: "reason",
  label: "Reason (saved in the audit log)",
} as const;

export default async function AdminUserPage({ params }: PageProps) {
  const account = await requireAdmin();
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();
  const endpoint = `/api/v1/admin/users/${user.userId}`;
  const roleLabel =
    user.role === "admin"
      ? "Admin"
      : user.organisation
        ? user.organisation.kind === "buyer"
          ? "Buyer"
          : "Seller"
        : "Not set up yet";

  return (
    <>
      <AppHeader name={account.email ?? "Admin"} />
      <main className="page-wrap flex flex-col gap-5 py-8">
        <p className="text-sm">
          <Link href="/admin/users">All users</Link>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold wrap-anywhere">{user.fullName ?? user.email}</h1>
          <StatusPill
            tone={user.disabled ? "bad" : "ok"}
            label={user.disabled ? "Login turned off" : "Can log in"}
          />
        </div>
        <p className="text-sm text-muted">Opening this page is recorded in the audit log.</p>
        <div className="grid items-start gap-5 md:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <FactList
              facts={[
                { label: "Email", value: user.email ?? "" },
                { label: "Role", value: roleLabel },
                { label: "Name", value: user.fullName ?? "Not given" },
                { label: "Job title", value: user.designation ?? "Not given" },
                { label: "Phone", value: user.phone ?? "Not given" },
                { label: "Email confirmed", value: user.emailConfirmed ? "Yes" : "No" },
                {
                  label: "Signed in on",
                  value: `${user.sessions} device${user.sessions === 1 ? "" : "s"}`,
                },
                {
                  label: "Last sign-in",
                  value: user.lastSignInAt ? shortDateTime(user.lastSignInAt) : "Never",
                },
                { label: "Joined", value: shortDateTime(user.createdAt) },
              ]}
            />
            {user.organisation ? (
              <p>
                Organisation:{" "}
                <Link className="underline" href={`/admin/organisations/${user.organisation.id}`}>
                  {user.organisation.legalName}
                </Link>{" "}
                ({user.organisation.status.replace("_", " ")})
              </p>
            ) : null}
            <p>
              <Link
                className="underline"
                href={`/admin/audit?entityType=user&entityId=${user.userId}`}
              >
                History for this user
              </Link>
            </p>
            <section aria-labelledby="edit-heading" className="flex max-w-md flex-col gap-3">
              <h2 id="edit-heading" className="text-xl font-bold">
                Edit details
              </h2>
              <ApiForm
                id="edit-user"
                endpoint={endpoint}
                method="PATCH"
                submitLabel="Save details"
                fields={[
                  {
                    name: "fullName",
                    label: "Name",
                    optional: true,
                    defaultValue: user.fullName ?? "",
                  },
                  {
                    name: "designation",
                    label: "Job title",
                    optional: true,
                    defaultValue: user.designation ?? "",
                  },
                  { name: "reason", label: "Reason (saved in the audit log)" },
                ]}
              />
            </section>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {user.isSelf ? (
              <Banner>This is your own login. You cannot turn it off from here.</Banner>
            ) : user.disabled ? (
              <ActionPanel title="Turn login back on">
                <ActionForm
                  id="enable"
                  endpoint={`${endpoint}/access`}
                  body={{ disable: false }}
                  buttonLabel="Allow login"
                  fields={[REASON]}
                />
              </ActionPanel>
            ) : (
              <ActionPanel title="Turn login off">
                <ActionForm
                  id="disable"
                  endpoint={`${endpoint}/access`}
                  body={{ disable: true }}
                  buttonLabel="Turn login off"
                  variant="danger"
                  fields={[REASON]}
                  note="They are signed out on every device at once and cannot log in until you turn it back on. Their records stay."
                />
              </ActionPanel>
            )}
            <ActionPanel title="Password reset">
              <ActionForm
                id="reset"
                endpoint={`${endpoint}/reset-password`}
                buttonLabel="Send reset email"
                variant="secondary"
                fields={[REASON]}
                note="They choose a new password from the email. Nobody at Bid Market sees it."
              />
            </ActionPanel>
          </div>
        </div>
      </main>
    </>
  );
}
