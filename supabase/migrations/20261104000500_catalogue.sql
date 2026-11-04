-- Catalogue tables from DATABASE.md section 3.2. The public reads through functions,
-- which return only published products and never reveal the seller's identity.
create extension if not exists pg_trgm with schema extensions;

create type public.product_status as enum ('draft', 'pending', 'notify', 'published', 'unpublished', 'rejected');
create type public.spec_kind as enum ('text', 'number', 'enum');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spec_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  key text not null,
  label text not null,
  kind public.spec_kind not null default 'text',
  unit text,
  allowed_values jsonb,
  min_value numeric,
  max_value numeric,
  is_key boolean not null default false,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, key)
);

create sequence public.product_no_seq;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  display_no text not null unique default ('BMP-' || lpad(nextval('public.product_no_seq')::text, 6, '0')),
  seller_org_id uuid not null references public.organisations (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null check (length(trim(title)) between 3 and 200),
  description text,
  search tsvector generated always as (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  mrp_paise bigint not null check (mrp_paise > 0),
  discount_bps integer not null default 0 check (discount_bps between 0 and 9000),
  net_paise bigint generated always as ((mrp_paise * (10000 - discount_bps) + 5000) / 10000) stored,
  stock_qty numeric(14, 3) not null default 0 check (stock_qty >= 0),
  unit text not null,
  status public.product_status not null default 'draft',
  review_note text,
  order_count integer not null default 0 check (order_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_states (
  product_id uuid not null references public.products (id) on delete cascade,
  state_code char(2) not null check (state_code ~ '^[0-9]{2}$'),
  primary key (product_id, state_code)
);

create table public.product_spec_values (
  product_id uuid not null references public.products (id) on delete cascade,
  spec_definition_id uuid not null references public.spec_definitions (id) on delete restrict,
  value_text text,
  value_number numeric,
  primary key (product_id, spec_definition_id),
  check (value_text is not null or value_number is not null)
);

create index products_category_idx on public.products (category_id, status, order_count desc);
create index products_seller_idx on public.products (seller_org_id, status);
create index products_search_idx on public.products using gin (search);
create index products_title_trgm_idx on public.products using gin (title extensions.gin_trgm_ops);
create index product_states_lookup_idx on public.product_states (state_code, product_id);
create index product_spec_text_idx on public.product_spec_values (spec_definition_id, value_text);
create index product_spec_number_idx on public.product_spec_values (spec_definition_id, value_number);
create index spec_definitions_category_idx on public.spec_definitions (category_id);

create trigger categories_updated before update on public.categories
  for each row execute function public.set_updated_at();
create trigger spec_definitions_updated before update on public.spec_definitions
  for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.spec_definitions enable row level security;
alter table public.products enable row level security;
alter table public.product_states enable row level security;
alter table public.product_spec_values enable row level security;

revoke all on public.categories, public.spec_definitions, public.products, public.product_states,
  public.product_spec_values from anon, authenticated;
revoke all on sequence public.product_no_seq from public, anon, authenticated;

grant select on public.categories, public.spec_definitions to anon, authenticated;

create policy active_categories on public.categories for select to anon, authenticated
  using (is_active);
create policy active_category_specs on public.spec_definitions for select to anon, authenticated
  using (exists (
    select from public.categories c where c.id = category_id and c.is_active
  ));

-- A product is public only while it is published and its seller is active and open.
create function public.search_products(
  p_query text default null,
  p_category_slug text default null,
  p_state_code text default null,
  p_sort text default 'popular',
  p_limit integer default 24,
  p_offset integer default 0
) returns table (
  id uuid, display_no text, category_slug text, category_name text, title text, mrp_paise bigint,
  discount_bps integer, net_paise bigint, unit text, city text, state_code char(2)
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_no, c.slug, c.name, p.title, p.mrp_paise, p.discount_bps, p.net_paise, p.unit,
    a.city, a.state_code
  from public.products p
  join public.categories c on c.id = p.category_id and c.is_active
  join public.organisations o on o.id = p.seller_org_id
    and o.status = 'active' and not o.maintenance
  left join public.org_addresses a on a.org_id = o.id and a.is_registered
  where p.status = 'published'
    and (p_category_slug is null or c.slug = p_category_slug)
    and (p_state_code is null or exists (
      select from public.product_states s where s.product_id = p.id and s.state_code = p_state_code
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

create function public.public_product(p_id uuid) returns table (
  id uuid, display_no text, category_slug text, category_name text, title text, description text,
  mrp_paise bigint, discount_bps integer, net_paise bigint, stock_qty numeric, unit text,
  city text, state_code char(2), delivery_states text[], specs jsonb
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
    ), '[]'::jsonb)
  from public.products p
  join public.categories c on c.id = p.category_id and c.is_active
  join public.organisations o on o.id = p.seller_org_id
    and o.status = 'active' and not o.maintenance
  left join public.org_addresses a on a.org_id = o.id and a.is_registered
  where p.id = p_id and p.status = 'published';
$$;

revoke all on function public.search_products, public.public_product from public;
grant execute on function public.search_products, public.public_product to anon, authenticated;

-- Placeholder launch categories until the owner chooses them (PRD D-6).
insert into public.categories (name, slug, description, sort_order) values
  ('Electrical and cables', 'electrical', 'Cables, switchgear and lighting', 10),
  ('Pipes and valves', 'pipes', 'GI pipe, HDPE and ball valves', 20),
  ('Safety and PPE', 'safety', 'Helmets, gloves and boots', 30),
  ('Tools and hardware', 'tools', 'Power tools and fasteners', 40),
  ('Bearings and drives', 'bearings', 'Ball bearings and V-belts', 50),
  ('IT and office', 'it', 'Laptops, printers and chairs', 60),
  ('Packaging', 'packaging', 'Cartons and stretch film', 70),
  ('Lubricants and chemicals', 'lubricants', 'Gear oil, grease and solvents', 80);

insert into public.spec_definitions (category_id, key, label, kind, unit, is_key, is_required)
select c.id, s.key, s.label, s.kind::public.spec_kind, s.unit, s.is_key, s.is_required
from public.categories c
join (values
  ('electrical', 'conductor', 'Conductor', 'text', null, true, true),
  ('electrical', 'rated_voltage', 'Rated voltage', 'text', null, true, false),
  ('pipes', 'material', 'Material', 'text', null, true, true),
  ('pipes', 'nominal_size', 'Nominal size', 'number', 'mm', true, true),
  ('safety', 'standard', 'Standard', 'text', null, true, false),
  ('tools', 'power', 'Power', 'number', 'W', false, false),
  ('bearings', 'bore', 'Bore', 'number', 'mm', true, true),
  ('it', 'warranty', 'Warranty', 'number', 'months', false, false),
  ('packaging', 'ply', 'Ply', 'number', null, true, false),
  ('lubricants', 'grade', 'Grade', 'text', null, true, true)
) as s (slug, key, label, kind, unit, is_key, is_required) on s.slug = c.slug;
