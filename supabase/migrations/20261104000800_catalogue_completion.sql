-- Finishes the catalogue: images, delete, category requests and admin tools, specification
-- filters and sub-categories. Also adds rate limits, idempotency and a database health check.
create function public.health_check() returns boolean
language sql stable as $$ select true; $$;
revoke all on function public.health_check from public;
grant execute on function public.health_check to anon, authenticated;

-- API safeguards.
create table public.idempotency_keys (
  user_id uuid not null,
  key text not null check (length(key) between 8 and 100),
  route text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.rate_counters (
  user_id uuid not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (user_id, window_start)
);

alter table public.idempotency_keys enable row level security;
alter table public.rate_counters enable row level security;
revoke all on public.idempotency_keys, public.rate_counters from anon, authenticated;

create function public.api_begin(p_key text, p_route text, p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_hits integer;
  v_row public.idempotency_keys;
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;

  insert into public.rate_counters (user_id, window_start)
  values (v_user_id, date_trunc('minute', now()))
  on conflict (user_id, window_start) do update set hits = public.rate_counters.hits + 1
  returning hits into v_hits;
  if v_hits > 60 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  delete from public.rate_counters where user_id = v_user_id and window_start < now() - interval '1 hour';
  delete from public.idempotency_keys where user_id = v_user_id and created_at < now() - interval '1 day';

  insert into public.idempotency_keys (user_id, key, route, request_hash)
  values (v_user_id, p_key, p_route, p_hash)
  on conflict (user_id, key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return null;
  end if;

  select * into v_row from public.idempotency_keys where user_id = v_user_id and key = p_key;
  if v_row.route <> p_route or v_row.request_hash <> p_hash then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
  if v_row.response_status is null then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  return jsonb_build_object('status', v_row.response_status, 'body', v_row.response_body);
end;
$$;

-- A failed request frees its key, so the same action can be retried.
create function public.api_finish(p_key text, p_status integer, p_body jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status >= 400 then
    delete from public.idempotency_keys where user_id = auth.uid() and key = p_key;
  else
    update public.idempotency_keys set response_status = p_status, response_body = p_body
    where user_id = auth.uid() and key = p_key and response_status is null;
  end if;
end;
$$;

-- Images. Files are re-encoded on the server before they reach this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/webp']);

create policy product_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.current_org_id()::text);
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.current_org_id()::text);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_media_product_idx on public.product_media (product_id, sort_order);
alter table public.product_media enable row level security;
revoke all on public.product_media from anon, authenticated;

create function public.add_product_image(p_id uuid, p_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_product public.products := private.own_product(p_id);
  v_media_id uuid;
begin
  if v_product.status not in ('draft', 'notify') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if left(p_path, length(v_org.id::text || '/' || p_id::text || '/')) <> v_org.id::text || '/' || p_id::text || '/' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if (select count(*) from public.product_media where product_id = p_id) >= 3 then
    raise exception 'LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;
  insert into public.product_media (product_id, storage_path, sort_order)
  values (p_id, p_path, (select count(*) from public.product_media where product_id = p_id))
  returning id into v_media_id;
  perform private.audit_product(p_id, v_org.id, 'product.image_added');
  return v_media_id;
end;
$$;

create function public.remove_product_image(p_media_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_media public.product_media;
  v_product public.products;
begin
  select * into v_media from public.product_media where id = p_media_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  v_product := private.own_product(v_media.product_id);
  if v_product.status not in ('draft', 'notify') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  delete from public.product_media where id = p_media_id;
  perform private.audit_product(v_media.product_id, v_org.id, 'product.image_removed');
  return v_media.storage_path;
end;
$$;

create function public.delete_product(p_id uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_product public.products := private.own_product(p_id);
  v_paths text[];
begin
  if v_product.stock_qty <> 0 or v_product.status = 'pending' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(storage_path), '{}') into v_paths from public.product_media where product_id = p_id;
  perform private.audit_product(p_id, v_org.id, 'product.deleted');
  delete from public.products where id = p_id;
  return v_paths;
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

-- Read functions gain images, sub-category matching and a specification filter.
drop function public.search_products(text, text, text, text, integer, integer);
drop function public.public_product(uuid);
drop function public.seller_products();

create function public.search_products(
  p_query text default null,
  p_category_slug text default null,
  p_state_code text default null,
  p_sort text default 'popular',
  p_limit integer default 24,
  p_offset integer default 0,
  p_spec_id uuid default null,
  p_spec_value text default null
) returns table (
  id uuid, display_no text, category_slug text, category_name text, title text, mrp_paise bigint,
  discount_bps integer, net_paise bigint, unit text, city text, state_code char(2), image_path text
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_no, c.slug, c.name, p.title, p.mrp_paise, p.discount_bps, p.net_paise, p.unit,
    a.city, a.state_code,
    (select m.storage_path from public.product_media m where m.product_id = p.id order by m.sort_order limit 1)
  from public.products p
  join public.categories c on c.id = p.category_id and c.is_active
  left join public.categories parent on parent.id = c.parent_id
  join public.organisations o on o.id = p.seller_org_id
    and o.status = 'active' and not o.maintenance
  left join public.org_addresses a on a.org_id = o.id and a.is_registered
  where p.status = 'published'
    and (p_category_slug is null or c.slug = p_category_slug or parent.slug = p_category_slug)
    and (p_state_code is null or exists (
      select from public.product_states s where s.product_id = p.id and s.state_code = p_state_code
    ))
    and (p_spec_id is null or exists (
      select from public.product_spec_values v
      where v.product_id = p.id and v.spec_definition_id = p_spec_id
        and coalesce(v.value_text, v.value_number::text) = p_spec_value
    ))
    and (
      nullif(trim(p_query), '') is null
      or p.search @@ websearch_to_tsquery('english'::regconfig, p_query)
      or p.title operator(extensions.%) p_query
      or c.name ilike '%' || p_query || '%'
    )
  order by
    case when p_sort = 'price_low' then p.net_paise end asc,
    case when p_sort = 'price_high' then p.net_paise end desc,
    p.order_count desc,
    p.id
  limit least(greatest(p_limit, 1), 48)
  offset greatest(p_offset, 0);
$$;

create function public.category_spec_values(p_category_slug text) returns table (
  spec_id uuid, label text, value text
)
language sql stable security definer set search_path = '' as $$
  select distinct d.id, d.label, coalesce(v.value_text, v.value_number::text)
  from public.product_spec_values v
  join public.spec_definitions d on d.id = v.spec_definition_id
  join public.products p on p.id = v.product_id and p.status = 'published'
  join public.categories c on c.id = p.category_id
  left join public.categories parent on parent.id = c.parent_id
  where c.slug = p_category_slug or parent.slug = p_category_slug
  order by 2, 3
  limit 200;
$$;

create function public.public_product(p_id uuid) returns table (
  id uuid, display_no text, category_slug text, category_name text, title text, description text,
  mrp_paise bigint, discount_bps integer, net_paise bigint, stock_qty numeric, unit text,
  city text, state_code char(2), delivery_states text[], specs jsonb, image_paths text[]
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_no, c.slug, c.name, p.title, p.description, p.mrp_paise, p.discount_bps,
    p.net_paise, p.stock_qty, p.unit, a.city, a.state_code,
    array(select s.state_code::text from public.product_states s where s.product_id = p.id order by 1),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', d.label,
        'value', coalesce(v.value_text, v.value_number::text),
        'unit', d.unit
      ) order by d.is_key desc, d.label)
      from public.product_spec_values v
      join public.spec_definitions d on d.id = v.spec_definition_id
      where v.product_id = p.id
    ), '[]'::jsonb),
    array(select m.storage_path from public.product_media m where m.product_id = p.id order by m.sort_order)
  from public.products p
  join public.categories c on c.id = p.category_id and c.is_active
  join public.organisations o on o.id = p.seller_org_id
    and o.status = 'active' and not o.maintenance
  left join public.org_addresses a on a.org_id = o.id and a.is_registered
  where p.id = p_id and p.status = 'published';
$$;

create function public.seller_products() returns table (
  id uuid, display_no text, title text, category_id uuid, category_name text, mrp_paise bigint,
  discount_bps integer, net_paise bigint, stock_qty numeric, unit text, status public.product_status,
  review_note text, description text, state_codes text[], specs jsonb, images jsonb
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_no, p.title, p.category_id, c.name, p.mrp_paise, p.discount_bps, p.net_paise,
    p.stock_qty, p.unit, p.status, p.review_note, p.description,
    array(select s.state_code::text from public.product_states s where s.product_id = p.id),
    coalesce((
      select jsonb_object_agg(v.spec_definition_id, coalesce(v.value_text, v.value_number::text))
      from public.product_spec_values v where v.product_id = p.id
    ), '{}'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'path', m.storage_path) order by m.sort_order)
      from public.product_media m where m.product_id = p.id
    ), '[]'::jsonb)
  from public.products p
  join public.categories c on c.id = p.category_id
  where p.seller_org_id = public.current_org_id()
  order by p.updated_at desc
  limit 200;
$$;

-- Category requests and admin tools.
create table public.category_requests (
  id uuid primary key default gen_random_uuid(),
  seller_org_id uuid not null references public.organisations (id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 100),
  details text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index category_requests_status_idx on public.category_requests (status, created_at);
create trigger category_requests_updated before update on public.category_requests
  for each row execute function public.set_updated_at();
alter table public.category_requests enable row level security;
revoke all on public.category_requests from anon, authenticated;
grant select (id, seller_org_id, name, details, status, review_note, created_at) on public.category_requests to authenticated;
create policy own_category_requests on public.category_requests for select to authenticated
  using (seller_org_id = public.current_org_id());

create function private.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
end;
$$;

create function private.audit_admin(p_entity_type text, p_entity_id text, p_action text, p_reason text default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, reason)
  values (auth.uid(), 'admin', p_action, p_entity_type, p_entity_id, p_reason);
$$;

create function public.request_category(p_name text, p_details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.active_seller();
  v_id uuid;
begin
  insert into public.category_requests (seller_org_id, name, details)
  values (v_org.id, trim(p_name), trim(p_details)) returning id into v_id;
  return v_id;
end;
$$;

create function public.admin_pending_category_requests() returns table (
  id uuid, name text, details text, seller_name text, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select r.id, r.name, r.details, o.legal_name, r.created_at
    from public.category_requests r
    join public.organisations o on o.id = r.seller_org_id
    where r.status = 'pending' order by r.created_at limit 100;
end;
$$;

create function public.admin_review_category_request(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_request public.category_requests;
  v_slug text;
begin
  perform private.require_admin();
  if length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_request from public.category_requests where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if p_approve then
    v_slug := trim(both '-' from regexp_replace(lower(v_request.name), '[^a-z0-9]+', '-', 'g'));
    insert into public.categories (name, slug, sort_order)
    values (v_request.name, v_slug, 1000)
    on conflict (slug) do nothing;
  end if;
  update public.category_requests
  set status = case when p_approve then 'approved' else 'rejected' end, review_note = p_note, reviewed_by = auth.uid()
  where id = p_id;
  perform private.audit_admin('category_request', p_id::text, 'category_request.reviewed', p_note);
end;
$$;

create function public.admin_categories() returns table (
  id uuid, parent_id uuid, name text, slug text, description text, is_active boolean, sort_order integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select c.id, c.parent_id, c.name, c.slug, c.description, c.is_active, c.sort_order
    from public.categories c order by c.sort_order, c.name limit 1000;
end;
$$;

create function public.admin_save_category(
  p_id uuid, p_parent_id uuid, p_name text, p_slug text, p_description text, p_is_active boolean, p_sort_order integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
begin
  perform private.require_admin();
  if v_id is null then
    insert into public.categories (parent_id, name, slug, description, is_active, sort_order)
    values (p_parent_id, trim(p_name), p_slug, nullif(trim(p_description), ''), p_is_active, p_sort_order)
    returning id into v_id;
  else
    update public.categories
    set parent_id = p_parent_id, name = trim(p_name), slug = p_slug,
      description = nullif(trim(p_description), ''), is_active = p_is_active, sort_order = p_sort_order
    where id = v_id;
    if not found then
      raise exception 'NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;
  perform private.audit_admin('category', v_id::text, 'category.saved');
  return v_id;
exception when unique_violation then
  raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
end;
$$;

create function public.admin_add_spec(
  p_category_id uuid, p_label text, p_kind public.spec_kind, p_unit text, p_is_key boolean, p_is_required boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform private.require_admin();
  insert into public.spec_definitions (category_id, key, label, kind, unit, is_key, is_required)
  values (p_category_id, trim(both '_' from regexp_replace(lower(p_label), '[^a-z0-9]+', '_', 'g')), trim(p_label),
    p_kind, nullif(trim(p_unit), ''), p_is_key, p_is_required)
  returning id into v_id;
  perform private.audit_admin('spec_definition', v_id::text, 'spec.added');
  return v_id;
exception when unique_violation then
  raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
end;
$$;

revoke all on function private.require_admin, private.audit_admin from public, anon, authenticated;
revoke all on function public.api_begin, public.api_finish, public.add_product_image, public.remove_product_image,
  public.delete_product, public.search_products, public.category_spec_values, public.public_product,
  public.seller_products, public.request_category, public.admin_pending_category_requests,
  public.admin_review_category_request, public.admin_categories, public.admin_save_category, public.admin_add_spec
  from public, anon, authenticated;
grant execute on function public.search_products, public.category_spec_values, public.public_product to anon, authenticated;
grant execute on function public.api_begin, public.api_finish, public.add_product_image, public.remove_product_image,
  public.delete_product, public.seller_products, public.request_category, public.admin_pending_category_requests,
  public.admin_review_category_request, public.admin_categories, public.admin_save_category, public.admin_add_spec
  to authenticated;
