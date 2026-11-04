-- Seller listing and admin product review. Status rules from PRD section 3.2.1 live here.
create function private.active_seller() returns public.organisations
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_org from public.organisations where id = public.current_org_id();
  if not found or v_org.kind <> 'seller' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_org.status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if v_org.blocked_until > now() then
    raise exception 'ACCOUNT_BLOCKED' using errcode = 'P0001';
  end if;
  return v_org;
end;
$$;

create function private.own_product(p_id uuid) returns public.products
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products;
begin
  select * into v_product from public.products
  where id = p_id and seller_org_id = public.current_org_id() for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_product;
end;
$$;

create function private.audit_product(p_product_id uuid, p_org_id uuid, p_action text, p_reason text default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, org_id, action, entity_type, entity_id, reason)
  values (auth.uid(), case when public.is_admin() then 'admin' else 'org_user' end, p_org_id, p_action,
    'product', p_product_id::text, p_reason);
$$;

create function public.save_product(
  p_id uuid, p_category_id uuid, p_title text, p_description text, p_mrp_paise bigint,
  p_discount_bps integer, p_stock_qty numeric, p_unit text, p_state_codes text[], p_specs jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_id uuid := p_id;
  v_product public.products;
begin
  if not exists (select from public.categories where id = p_category_id and is_active) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if exists (
    select from jsonb_array_elements(p_specs) as item
    join public.spec_definitions d on d.id = (item ->> 'specId')::uuid
    where d.kind = 'number' and item ->> 'value' !~ '^[0-9]+(\.[0-9]+)?$'
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  if v_id is null then
    insert into public.products (seller_org_id, category_id, title, description, mrp_paise, discount_bps, stock_qty, unit)
    values (v_org.id, p_category_id, trim(p_title), nullif(trim(p_description), ''), p_mrp_paise, p_discount_bps, p_stock_qty, p_unit)
    returning id into v_id;
  else
    v_product := private.own_product(v_id);
    if v_product.status not in ('draft', 'notify') then
      raise exception 'INVALID_STATE' using errcode = 'P0001';
    end if;
    update public.products
    set category_id = p_category_id, title = trim(p_title), description = nullif(trim(p_description), ''),
      mrp_paise = p_mrp_paise, discount_bps = p_discount_bps, stock_qty = p_stock_qty, unit = p_unit
    where id = v_id;
    delete from public.product_states where product_id = v_id;
    delete from public.product_spec_values where product_id = v_id;
  end if;

  insert into public.product_states (product_id, state_code)
  select v_id, code from unnest(p_state_codes) as code;

  insert into public.product_spec_values (product_id, spec_definition_id, value_text, value_number)
  select v_id, d.id,
    case when d.kind = 'number' then null else item ->> 'value' end,
    case when d.kind = 'number' then (item ->> 'value')::numeric end
  from jsonb_array_elements(p_specs) as item
  join public.spec_definitions d on d.id = (item ->> 'specId')::uuid and d.category_id = p_category_id;

  perform private.audit_product(v_id, v_org.id, 'product.saved');
  return v_id;
end;
$$;

create function public.submit_product(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_product public.products := private.own_product(p_id);
begin
  if v_product.status not in ('draft', 'notify') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if v_product.discount_bps < 1000
    or v_product.stock_qty <= 0
    or not exists (select from public.product_states where product_id = p_id)
    or exists (
      select from public.spec_definitions d
      where d.category_id = v_product.category_id and d.is_required
        and not exists (
          select from public.product_spec_values v
          where v.product_id = p_id and v.spec_definition_id = d.id
        )
    )
  then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.products set status = 'pending', review_note = null where id = p_id;
  perform private.audit_product(p_id, v_org.id, 'product.submitted');
end;
$$;

create function public.set_product_visibility(p_id uuid, p_visible boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_product public.products := private.own_product(p_id);
begin
  if v_product.status <> (case when p_visible then 'unpublished' else 'published' end)::public.product_status then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.products
  set status = (case when p_visible then 'published' else 'unpublished' end)::public.product_status
  where id = p_id;
  perform private.audit_product(p_id, v_org.id, case when p_visible then 'product.published' else 'product.unpublished' end);
end;
$$;

create function public.update_product_commercials(
  p_id uuid, p_mrp_paise bigint, p_discount_bps integer, p_stock_qty numeric
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_product public.products := private.own_product(p_id);
begin
  if v_product.status not in ('published', 'unpublished') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if p_discount_bps < 1000 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.products
  set mrp_paise = p_mrp_paise, discount_bps = p_discount_bps, stock_qty = p_stock_qty
  where id = p_id;
  perform private.audit_product(p_id, v_org.id, 'product.commercials_updated');
end;
$$;

create function public.seller_products() returns table (
  id uuid, display_no text, title text, category_id uuid, category_name text, mrp_paise bigint,
  discount_bps integer, net_paise bigint, stock_qty numeric, unit text, status public.product_status,
  review_note text, description text, state_codes text[], specs jsonb
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_no, p.title, p.category_id, c.name, p.mrp_paise, p.discount_bps, p.net_paise,
    p.stock_qty, p.unit, p.status, p.review_note, p.description,
    array(select s.state_code::text from public.product_states s where s.product_id = p.id),
    coalesce((
      select jsonb_object_agg(v.spec_definition_id, coalesce(v.value_text, v.value_number::text))
      from public.product_spec_values v where v.product_id = p.id
    ), '{}'::jsonb)
  from public.products p
  join public.categories c on c.id = p.category_id
  where p.seller_org_id = public.current_org_id()
  order by p.updated_at desc
  limit 200;
$$;

create function public.admin_pending_products() returns table (
  id uuid, display_no text, title text, description text, category_name text, seller_name text,
  mrp_paise bigint, discount_bps integer, net_paise bigint, stock_qty numeric, unit text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select p.id, p.display_no, p.title, p.description, c.name, o.legal_name, p.mrp_paise, p.discount_bps,
      p.net_paise, p.stock_qty, p.unit
    from public.products p
    join public.categories c on c.id = p.category_id
    join public.organisations o on o.id = p.seller_org_id
    where p.status = 'pending'
    order by p.updated_at
    limit 100;
end;
$$;

create function public.admin_review_product(p_id uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_decision not in ('published', 'notify', 'rejected') or length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_product from public.products where id = p_id for update;
  if not found or v_product.status <> 'pending' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.products set status = p_decision::public.product_status, review_note = p_note where id = p_id;
  perform private.audit_product(p_id, v_product.seller_org_id, 'product.' || p_decision, p_note);
end;
$$;

-- Temporary. Remove before launch, when subscription payment replaces this step.
create function public.admin_payment_pending_sellers() returns table (id uuid, legal_name text, gstin text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  return query
    select o.id, o.legal_name, o.gstin from public.organisations o
    where o.status = 'pending_payment' order by o.created_at limit 100;
end;
$$;

create function public.admin_test_activate_seller(p_org_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  update public.organisations set status = 'active' where id = p_org_id and status = 'pending_payment';
  if not found then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.audit(p_org_id, 'organisation.test_activated', null, p_reason);
end;
$$;

revoke all on function private.active_seller, private.own_product, private.audit_product from public, anon, authenticated;
revoke all on function public.save_product, public.submit_product, public.set_product_visibility,
  public.update_product_commercials, public.seller_products, public.admin_pending_products,
  public.admin_review_product, public.admin_payment_pending_sellers, public.admin_test_activate_seller
  from public, anon, authenticated;
grant execute on function public.save_product, public.submit_product, public.set_product_visibility,
  public.update_product_commercials, public.seller_products, public.admin_pending_products,
  public.admin_review_product, public.admin_payment_pending_sellers, public.admin_test_activate_seller
  to authenticated;
