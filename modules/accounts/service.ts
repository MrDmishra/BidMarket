import "server-only";

import { toAppError } from "@/lib/errors/database";
import { createUserClient } from "@/lib/supabase/server";
import { CURRENT_POLICY_VERSION } from "@/modules/accounts/schemas";
import type { EntityType, OrgKind } from "@/lib/supabase/database.types";

type NewOrganisation = { kind: OrgKind; entityType: EntityType; legalName: string };

export async function createOrganisation({ kind, entityType, legalName }: NewOrganisation) {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("create_organisation", {
    p_kind: kind,
    p_entity_type: entityType,
    p_legal_name: legalName,
    p_policy_version: CURRENT_POLICY_VERSION,
  });
  if (error) throw toAppError(error);
  return { id: data, kind };
}
