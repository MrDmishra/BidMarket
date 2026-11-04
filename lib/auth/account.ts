import "server-only";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import type { OrgKind, OrgStatus, UserRole } from "@/lib/supabase/domain-types";

export type Account = {
  userId: string;
  email: string | null;
  role: UserRole;
  organisation: { id: string; kind: OrgKind; legalName: string; status: OrgStatus } | null;
};

export async function getAccount(): Promise<Account | null> {
  const supabase = await createUserClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, org_id, role, email")
    .eq("user_id", authData.user.id)
    .single();
  if (!profile) return null;

  const { data: organisation } = profile.org_id
    ? await supabase
        .from("organisations")
        .select("id, kind, legal_name, status")
        .eq("id", profile.org_id)
        .single()
    : { data: null };

  return {
    userId: profile.user_id,
    email: profile.email,
    role: profile.role,
    organisation: organisation && {
      id: organisation.id,
      kind: organisation.kind,
      legalName: organisation.legal_name,
      status: organisation.status,
    },
  };
}

export async function requireOrganisation(kind: OrgKind) {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (account.role === "admin") redirect("/admin");
  if (!account.organisation) redirect("/onboarding");
  if (account.organisation.kind !== kind) redirect("/forbidden");
  return { ...account, organisation: account.organisation };
}

/** Admin role without the second factor. Only the security page may use this. */
export async function requireAdminRole() {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (account.role !== "admin") redirect("/forbidden");
  return account;
}

export async function requireAdmin() {
  const account = await requireAdminRole();
  const supabase = await createUserClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel !== "aal2") redirect("/admin/security");
  return account;
}
