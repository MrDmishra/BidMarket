-- Admin tools for live products, and page-numbered audit log search.

-- The seller behind a product, for support. Buyers never see this.
create function public.admin_product(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object('status', p.status, 'reviewNote', p.review_note, 'sellerOrgId', o.id,
    'sellerName', o.legal_name, 'sellerStatus', o.status)
  into v_result
  from public.products p join public.organisations o on o.id = p.seller_org_id
  where p.id = p_id;
  if v_result is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_result;
end;
$$;

-- Hides a live product and asks the seller for changes. The seller can then edit it, photos
-- included, and submit it for review again.
create function public.admin_take_down_product(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_product public.products;
begin
  perform private.require_admin();
  select * into v_product from public.products where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_product.status not in ('published', 'unpublished') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.products set status = 'notify', review_note = v_reason where id = p_id;
  perform private.audit_product(p_id, v_product.seller_org_id, 'product.taken_down', v_reason);
  perform private.notify_org(v_product.seller_org_id, 'support_update',
    'product_taken_down:' || p_id || ':' || extract(epoch from now())::bigint,
    jsonb_build_object('refNo', v_product.display_no));
end;
$$;

-- Page numbers need the total, so every row carries it.
create function public.admin_audit_log_page(
  p_entity_type text default null, p_entity_id text default null, p_action text default null,
  p_page integer default 1, p_page_size integer default 25
) returns table (
  id bigint, created_at timestamptz, actor text, actor_role text, action text, entity_type text,
  entity_id text, reason text, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_size integer := least(greatest(coalesce(p_page_size, 25), 10), 100);
begin
  perform private.require_admin();
  return query
    select a.id, a.created_at, coalesce(pr.email, a.actor_role), a.actor_role, a.action, a.entity_type,
      a.entity_id, a.reason, count(*) over ()
    from public.audit_log a left join public.profiles pr on pr.user_id = a.actor_id
    where (nullif(p_entity_type, '') is null or a.entity_type = p_entity_type)
      and (nullif(p_entity_id, '') is null or a.entity_id = p_entity_id)
      and (nullif(p_action, '') is null or a.action ilike p_action || '%')
    order by a.id desc
    limit v_size offset (greatest(coalesce(p_page, 1), 1) - 1) * v_size;
end;
$$;

revoke all on function public.admin_product, public.admin_take_down_product, public.admin_audit_log_page
  from public, anon;
grant execute on function public.admin_product, public.admin_take_down_product, public.admin_audit_log_page
  to authenticated;
