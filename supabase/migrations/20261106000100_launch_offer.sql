-- Launch offer: the first sellers get a percentage off their first year (D-3).
-- free_subscription_sellers stays until the app no longer reads it, and goes in a later migration.
alter table public.platform_settings
  add column launch_offer_sellers integer not null default 0 check (launch_offer_sellers >= 0),
  add column launch_offer_bps integer not null default 0 check (launch_offer_bps between 0 and 10000);

do $$
declare
  v_row public.platform_settings := private.current_settings();
begin
  v_row.id := gen_random_uuid();
  v_row.effective_from := now();
  v_row.created_by := null;
  v_row.launch_offer_sellers := 100;
  v_row.launch_offer_bps := 5000;
  insert into public.platform_settings values (v_row.*);
end;
$$;

create or replace function private.subscription_quote(p_org public.organisations, p_settings public.platform_settings)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_turnover bigint;
  v_offer boolean;
  v_fee bigint;
begin
  select coalesce(sum(amount_paise), 0) into v_turnover
  from (
    select amount_paise from public.turnover_declarations
    where org_id = p_org.id order by financial_year desc limit 3
  ) as recent;
  v_offer := not exists (
      select from public.subscriptions where org_id = p_org.id and status in ('active', 'expired')
    ) and (
      select count(distinct org_id) from public.subscriptions where status in ('active', 'expired')
    ) < p_settings.launch_offer_sellers;
  v_fee := p_settings.subscription_base_paise
    + greatest(0, v_turnover / 1000000000 - p_settings.subscription_base_crore) * p_settings.subscription_step_paise;
  if v_offer then
    v_fee := v_fee - round(v_fee::numeric * p_settings.launch_offer_bps / 10000)::bigint;
  end if;
  return jsonb_build_object(
    'turnoverPaise', v_turnover,
    'feePaise', v_fee,
    'gstPaise', round(v_fee::numeric * p_settings.gst_bps / 10000)::bigint,
    'free', v_fee = 0,
    'offerBps', case when v_offer then p_settings.launch_offer_bps else 0 end
  );
end;
$$;

drop function public.admin_save_settings(integer, integer, integer, integer, bigint, bigint, integer, text);

create function public.admin_save_settings(
  p_direct_fee_bps integer, p_tender_fee_bps integer, p_gst_bps integer, p_tds_bps integer,
  p_subscription_base_paise bigint, p_subscription_step_paise bigint, p_launch_offer_sellers integer, p_launch_offer_bps integer,
  p_reason text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.platform_settings := private.current_settings();
begin
  perform private.require_admin();
  if nullif(trim(p_reason), '') is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  v_row.id := gen_random_uuid();
  v_row.effective_from := now();
  v_row.created_by := auth.uid();
  v_row.direct_fee_bps := p_direct_fee_bps;
  v_row.tender_fee_bps := p_tender_fee_bps;
  v_row.gst_bps := p_gst_bps;
  v_row.tds_bps := p_tds_bps;
  v_row.subscription_base_paise := p_subscription_base_paise;
  v_row.subscription_step_paise := p_subscription_step_paise;
  v_row.launch_offer_sellers := p_launch_offer_sellers;
  v_row.launch_offer_bps := p_launch_offer_bps;
  insert into public.platform_settings values (v_row.*);
  perform private.audit_admin('platform_settings', v_row.id::text, 'settings.changed', trim(p_reason));
  return v_row.id;
end;
$$;

revoke all on function public.admin_save_settings from public, anon, authenticated;
grant execute on function public.admin_save_settings to authenticated;
