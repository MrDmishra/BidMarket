import "server-only";

import { toAppError } from "@/lib/errors/database";
import { createUserClient } from "@/lib/supabase/server";
import { CURRENT_POLICY_VERSION } from "@/modules/accounts/schemas";
import { rupeesToPaise } from "@/lib/money";
import { recentFinancialYears } from "@/lib/time/financial-year";
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

export async function saveBusinessIdentity({ pan, gstin }: { pan: string; gstin: string }) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("save_business_identity", { p_pan: pan, p_gstin: gstin });
  if (error) throw toAppError(error);
}

type NewAddress = {
  line1: string;
  line2: string;
  city: string;
  stateCode: string;
  pincode: string;
};

export async function addRegisteredAddress(address: NewAddress) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("add_registered_address", {
    p_line1: address.line1,
    p_line2: address.line2,
    p_city: address.city,
    p_state_code: address.stateCode,
    p_pincode: address.pincode,
  });
  if (error) throw toAppError(error);
}

type NewBankAccount = { holderName: string; accountNumber: string; ifsc: string };

export async function addBankAccount({ holderName, accountNumber, ifsc }: NewBankAccount) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("add_bank_account", {
    p_holder_name: holderName,
    p_account_no: accountNumber,
    p_ifsc: ifsc,
  });
  if (error) throw toAppError(error);
}

export async function saveTurnover(input: { year1: string; year2: string; year3: string }) {
  const [first, second, third] = recentFinancialYears() as [string, string, string];
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("save_turnover", {
    p_years: [
      { financialYear: first, amountPaise: rupeesToPaise(input.year1) },
      { financialYear: second, amountPaise: rupeesToPaise(input.year2) },
      { financialYear: third, amountPaise: rupeesToPaise(input.year3) },
    ],
  });
  if (error) throw toAppError(error);
}

export async function submitOrganisation() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("submit_organisation");
  if (error) throw toAppError(error);
  return { status: data };
}

export async function getVerificationProgress(organisationId: string) {
  const supabase = await createUserClient();
  const [organisation, address, bank, turnover] = await Promise.all([
    supabase.from("organisations").select("pan_last4, gstin").eq("id", organisationId).single(),
    supabase.from("org_addresses").select("city, pincode").limit(1).maybeSingle(),
    supabase.from("bank_accounts").select("account_last4, ifsc").limit(1).maybeSingle(),
    supabase.from("turnover_declarations").select("financial_year"),
  ]);
  return {
    panLast4: organisation.data?.pan_last4 ?? null,
    gstin: organisation.data?.gstin ?? null,
    address: address.data,
    bank: bank.data,
    turnoverYears: turnover.data?.length ?? 0,
  };
}

export async function listPendingOrganisations() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_pending_organisations");
  if (error) throw toAppError(error);
  return data;
}

export async function reviewOrganisation(id: string, approve: boolean, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_review_organisation", {
    p_org_id: id,
    p_approve: approve,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}

export async function listPaymentPendingSellers() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("admin_payment_pending_sellers");
  if (error) throw toAppError(error);
  return data;
}

export async function testActivateSeller(id: string, reason: string) {
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("admin_test_activate_seller", {
    p_org_id: id,
    p_reason: reason,
  });
  if (error) throw toAppError(error);
}
