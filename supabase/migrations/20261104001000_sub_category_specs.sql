-- The last Raw Material sub-categories, missing from the first list.
insert into public.categories (parent_id, name, slug, sort_order)
select p.id, s.name, s.slug, s.sort_order
from (values
  ('Rubber and polymer materials', 'rubber-and-polymer-materials', 80),
  ('Textile raw materials', 'textile-raw-materials', 90),
  ('Wood and laminate materials', 'wood-and-laminate-materials', 100)
) as s (name, slug, sort_order)
join public.categories p on p.slug = 'raw-materials';

-- A sub-category uses its own specifications and those of its main category.
create function private.spec_category_ids(p_category_id uuid) returns setof uuid
language sql stable set search_path = '' as $$
  select id from public.categories where id = p_category_id
  union
  select parent_id from public.categories where id = p_category_id and parent_id is not null;
$$;

create or replace function public.save_product(
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
  join public.spec_definitions d on d.id = (item ->> 'specId')::uuid and d.category_id in (select private.spec_category_ids(p_category_id));

  perform private.audit_product(v_id, v_org.id, 'product.saved');
  return v_id;
end;
$$;

create or replace function public.submit_product(p_id uuid) returns void
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
    or (select count(*) from public.product_media where product_id = p_id) < 3
    or not exists (select from public.product_states where product_id = p_id)
    or exists (
      select from public.spec_definitions d
      where d.category_id in (select private.spec_category_ids(v_product.category_id)) and d.is_required
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
