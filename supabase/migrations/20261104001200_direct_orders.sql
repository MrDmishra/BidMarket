-- Direct orders: private files, the order lifecycle, held fees and masked reads.
alter function public.health_check() set search_path = '';

create type public.order_source as enum ('direct', 'tender');
create type public.order_status as enum ('unpaid', 'awaiting_seller', 'accepted', 'dispatched', 'completed', 'cancelled');
create type public.payment_terms as enum ('advance', 'on_delivery', 'credit');
create type public.file_scan_status as enum ('pending', 'clean', 'infected');

create table public.files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null unique,
  owner_org_id uuid not null references public.organisations (id),
  uploaded_by uuid not null references public.profiles (user_id),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null,
  scan_status public.file_scan_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index files_owner_idx on public.files (owner_org_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  source public.order_source not null default 'direct',
  tender_id uuid,
  product_id uuid references public.products (id),
  buyer_org_id uuid not null references public.organisations (id),
  seller_org_id uuid not null references public.organisations (id),
  title text not null,
  unit text not null,
  spec_snapshot jsonb not null default '[]',
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_paise bigint not null check (unit_paise > 0),
  total_paise bigint not null check (total_paise > 0),
  payment_terms public.payment_terms not null,
  credit_days integer check (credit_days > 0),
  expected_delivery_on date,
  consignee_name text not null,
  consignee_gstin text,
  delivery_address jsonb not null,
  status public.order_status not null default 'unpaid',
  contacts_unlocked_at timestamptz,
  settings_id uuid not null references public.platform_settings (id),
  created_at timestamptz not null default now(),
  check ((payment_terms = 'credit') = (credit_days is not null))
);
create index orders_buyer_idx on public.orders (buyer_org_id, status, created_at desc);
create index orders_seller_idx on public.orders (seller_org_id, status, created_at desc);
create index orders_unpaid_idx on public.orders (created_at) where status = 'unpaid';
create unique index orders_one_per_tender on public.orders (tender_id) where tender_id is not null;

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id),
  status public.order_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, id);

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  kind text not null check (kind in ('product_bill', 'eway_bill', 'transport_bill', 'delivery_proof')),
  file_id uuid references public.files (id),
  reference_no text,
  not_applicable_reason text,
  unique (order_id, kind),
  check (num_nonnulls(file_id, reference_no, not_applicable_reason) >= 1),
  check (kind not in ('product_bill', 'delivery_proof') or file_id is not null)
);
create index order_documents_file_idx on public.order_documents (file_id);

alter table public.fee_charges add constraint fee_charges_order_fkey foreign key (order_id) references public.orders (id);
create unique index fee_charges_one_per_order_kind on public.fee_charges (order_id, kind) where order_id is not null;

create trigger order_events_append_only before update or delete on public.order_events
  for each row execute function public.reject_change();
create trigger order_documents_fixed before update or delete on public.order_documents
  for each row execute function public.reject_change();

alter table public.files enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.order_documents enable row level security;
revoke all on public.files, public.orders, public.order_events, public.order_documents from anon, authenticated;

-- Reads go through get_order and list_orders, which mask contact details until they unlock.
create policy own_files on public.files for select to authenticated
  using (owner_org_id = public.current_org_id() or public.is_admin());
grant select on public.files to authenticated;

-- Other parties can open a file only after it is marked clean.
create function public.can_read_order_file(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select from public.files f
    where f.path = p_path and (
      f.owner_org_id = public.current_org_id()
      or public.is_admin()
      or (f.scan_status = 'clean' and exists (
        select from public.order_documents d
        join public.orders o on o.id = d.order_id
        where d.file_id = f.id and public.current_org_id() in (o.buyer_org_id, o.seller_org_id)
      ))
    )
  );
$$;
revoke all on function public.can_read_order_file from public, anon;
grant execute on function public.can_read_order_file to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-documents', 'order-documents', false, 4194304, array['application/pdf', 'image/webp']);
create policy order_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'order-documents' and (storage.foldername(name))[1] = public.current_org_id()::text);
create policy order_documents_read on storage.objects for select to authenticated
  using (bucket_id = 'order-documents' and public.can_read_order_file(name));

create function private.active_buyer() returns public.organisations
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
begin
  if v_org.kind <> 'buyer' then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_org.status <> 'active' or v_org.maintenance then
    raise exception 'ACCOUNT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  return v_org;
end;
$$;

create function private.order_event(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.order_events (order_id, status, actor_id, note)
  values (p_order_id, p_status, auth.uid(), p_note);
$$;

create function private.held_paise(p_charge_id uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_paise) filter (where to_bucket = 'on_hold'), 0)
       - coalesce(sum(amount_paise) filter (where from_bucket = 'on_hold'), 0)
  from public.wallet_entries where charge_id = p_charge_id;
$$;

-- Returns held money to the wallet as non-withdrawable balance, as D-2 requires.
create function private.release_charge(p_charge_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_charge public.fee_charges;
  v_held bigint;
begin
  select * into v_charge from public.fee_charges where id = p_charge_id for update;
  if v_charge.status not in ('pending', 'held') then
    return;
  end if;
  v_held := private.held_paise(p_charge_id);
  if v_held > 0 then
    insert into public.wallet_entries (org_id, charge_id, from_bucket, to_bucket, amount_paise, reason)
    values (v_charge.org_id, p_charge_id, 'on_hold', 'available', v_held, 'Fee returned to wallet');
  end if;
  update public.fee_charges set status = case when v_held > 0 then 'released' else 'cancelled' end::public.charge_status
  where id = p_charge_id;
  perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.released');
end;
$$;

-- Moves a held order fee to Paid when the order completes, and issues its tax invoice.
create function private.finish_charge(p_charge_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_charge public.fee_charges;
  v_held bigint;
begin
  select * into v_charge from public.fee_charges where id = p_charge_id for update;
  if v_charge.status <> 'held' then
    return;
  end if;
  v_held := private.held_paise(p_charge_id);
  if v_held > 0 then
    insert into public.wallet_entries (org_id, charge_id, from_bucket, to_bucket, amount_paise, reason)
    values (v_charge.org_id, p_charge_id, 'on_hold', 'paid', v_held, 'Fee earned on a completed order');
  end if;
  update public.fee_charges set status = 'paid' where id = p_charge_id;
  if v_charge.total_paise > 0 then
    perform private.issue_invoice(v_charge);
  end if;
  perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.paid',
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
end;
$$;

create or replace function private.settle_charge(p_charge_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_charge public.fee_charges;
  v_held bigint;
  v_order public.orders;
begin
  select * into v_charge from public.fee_charges where id = p_charge_id for update;
  if v_charge.status <> 'pending' then
    return false;
  end if;
  v_held := private.held_paise(p_charge_id);

  if v_charge.kind in ('direct_buyer', 'direct_seller') then
    if v_charge.total_paise > v_held then
      insert into public.wallet_entries (org_id, charge_id, to_bucket, amount_paise, reason)
      values (v_charge.org_id, p_charge_id, 'on_hold', v_charge.total_paise - v_held, 'Fee held until the order completes');
    end if;
    update public.fee_charges set status = 'held' where id = p_charge_id;
    select * into v_order from public.orders where id = v_charge.order_id for update;
    if v_charge.kind = 'direct_buyer' then
      update public.orders set status = 'awaiting_seller' where id = v_order.id;
      perform private.order_event(v_order.id, 'awaiting_seller', 'Buyer fee received');
      perform private.notify_org(v_order.seller_org_id, 'order_update', 'order_placed:' || v_order.id,
        jsonb_build_object('orderNo', v_order.order_no, 'status', 'awaiting_seller'));
    else
      update public.orders set status = 'accepted', contacts_unlocked_at = now() where id = v_order.id;
      perform private.order_event(v_order.id, 'accepted', 'Seller fee received');
      perform private.notify_org(v_order.buyer_org_id, 'order_update', 'order_accepted:' || v_order.id,
        jsonb_build_object('orderNo', v_order.order_no, 'status', 'accepted'));
    end if;
    perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.held',
      jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
    return true;
  end if;

  if v_held > 0 then
    insert into public.wallet_entries (org_id, charge_id, from_bucket, to_bucket, amount_paise, reason)
    values (v_charge.org_id, p_charge_id, 'on_hold', 'paid', v_held, 'Wallet balance used for a fee');
  end if;
  if v_charge.total_paise > v_held then
    insert into public.wallet_entries (org_id, charge_id, to_bucket, amount_paise, reason)
    values (v_charge.org_id, p_charge_id, 'paid', v_charge.total_paise - v_held, 'Fee paid online');
  end if;

  update public.fee_charges set status = 'paid' where id = p_charge_id;
  if v_charge.total_paise > 0 then
    perform private.issue_invoice(v_charge);
  end if;
  if v_charge.kind = 'subscription' then
    perform private.activate_subscription(v_charge.subscription_id);
  end if;
  perform private.audit_billing(v_charge.org_id, p_charge_id, 'charge.paid',
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
  perform private.notify_org(v_charge.org_id, 'charge_paid', 'charge_paid:' || p_charge_id,
    jsonb_build_object('kind', v_charge.kind, 'totalPaise', v_charge.total_paise));
  return true;
end;
$$;

drop function private.create_charge(uuid, public.charge_kind, uuid, bigint, integer, public.platform_settings);

-- Same state means CGST and SGST. Another state means IGST. The odd paisa goes to SGST.
create function private.create_charge(
  p_org_id uuid, p_kind public.charge_kind, p_subscription_id uuid, p_base_paise bigint, p_rate_bps integer,
  p_settings public.platform_settings, p_order_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_state char(2);
  v_fee bigint := round(p_base_paise::numeric * p_rate_bps / 10000);
  v_gst bigint;
  v_cgst bigint := 0;
  v_sgst bigint := 0;
  v_igst bigint := 0;
  v_tds bigint;
  v_id uuid;
begin
  select state_code into v_state from public.org_addresses where org_id = p_org_id and is_registered;
  if not found then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  v_gst := round(v_fee::numeric * p_settings.gst_bps / 10000);
  v_tds := round(v_fee::numeric * p_settings.tds_bps / 10000);
  if v_state = p_settings.supplier_state_code then
    v_cgst := v_gst / 2;
    v_sgst := v_gst - v_cgst;
  else
    v_igst := v_gst;
  end if;
  insert into public.fee_charges (
    org_id, kind, subscription_id, order_id, base_paise, rate_bps, fee_paise, cgst_paise, sgst_paise, igst_paise,
    tds_paise, total_paise, settings_id
  ) values (
    p_org_id, p_kind, p_subscription_id, p_order_id, p_base_paise, p_rate_bps, v_fee, v_cgst, v_sgst, v_igst,
    v_tds, v_fee + v_gst - v_tds, p_settings.id
  ) returning id into v_id;
  return v_id;
end;
$$;

create function private.create_order_charge(p_order_id uuid, p_org_id uuid, p_kind public.charge_kind) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_settings public.platform_settings;
  v_id uuid;
  v_total bigint;
begin
  select * into v_order from public.orders where id = p_order_id;
  select * into v_settings from public.platform_settings where id = v_order.settings_id;
  v_id := private.create_charge(p_org_id, p_kind, null, v_order.total_paise, v_settings.direct_fee_bps, v_settings, p_order_id);
  select total_paise into v_total from public.fee_charges where id = v_id;
  if v_total = 0 then
    perform private.settle_charge(v_id);
  end if;
  return v_id;
end;
$$;

create function private.next_order_no(p_financial_year text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_value bigint;
begin
  insert into public.number_sequences (name, financial_year, next_value)
  values ('order', p_financial_year, 2)
  on conflict (name, financial_year) do update set next_value = public.number_sequences.next_value + 1
  returning next_value - 1 into v_value;
  return 'BMO-' || substr(p_financial_year, 3, 2) || '-' || lpad(v_value::text, 6, '0');
end;
$$;

-- Amounts and limits have one source, so a quote can never differ from the order.
create function private.order_amounts(
  p_buyer public.organisations, p_net_paise bigint, p_quantity numeric, p_settings public.platform_settings
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_total bigint := round(p_net_paise * p_quantity);
  v_fee bigint := round(v_total::numeric * p_settings.direct_fee_bps / 10000);
  v_limit bigint := case when p_buyer.entity_type = 'individual'
    then p_settings.limit_individual_paise else p_settings.limit_org_paise end;
begin
  if p_quantity <= 0 or v_total <= 0 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if v_total >= v_limit then
    raise exception 'LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;
  return jsonb_build_object('valuePaise', v_total, 'feePaise', v_fee,
    'gstPaise', round(v_fee::numeric * p_settings.gst_bps / 10000)::bigint, 'limitPaise', v_limit);
end;
$$;

create function public.quote_order(p_product_id uuid, p_quantity numeric) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_buyer public.organisations;
  v_net bigint;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_buyer from public.organisations where id = public.current_org_id() and kind = 'buyer';
  if not found then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select net_paise into v_net from public.products where id = p_product_id and status = 'published';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return private.order_amounts(v_buyer, v_net, p_quantity, private.current_settings());
end;
$$;

create function public.create_order(
  p_product_id uuid, p_quantity numeric, p_expected_delivery_on date, p_consignee_name text, p_consignee_gstin text,
  p_delivery_address_id uuid, p_payment_terms public.payment_terms, p_credit_days integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_buyer public.organisations := private.active_buyer();
  v_settings public.platform_settings := private.current_settings();
  v_product public.products;
  v_address public.org_addresses;
  v_amounts jsonb;
  v_order_id uuid;
  v_charge_id uuid;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  -- The row lock stops two buyers from taking the last stock.
  select * into v_product from public.products where id = p_product_id and status = 'published' for update;
  if not found or not exists (
    select from public.organisations
    where id = v_product.seller_org_id and status = 'active' and not maintenance
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_address from public.org_addresses where id = p_delivery_address_id and org_id = v_buyer.id;
  if not found or p_expected_delivery_on < v_today + 5 or nullif(trim(p_consignee_name), '') is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if (p_payment_terms = 'credit') <> (coalesce(p_credit_days, 0) > 0) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if not exists (
    select from public.product_states where product_id = p_product_id and state_code = v_address.state_code
  ) then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if p_quantity > v_product.stock_qty then
    raise exception 'LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;
  v_amounts := private.order_amounts(v_buyer, v_product.net_paise, p_quantity, v_settings);

  update public.products set stock_qty = stock_qty - p_quantity where id = p_product_id;
  insert into public.orders (
    order_no, product_id, buyer_org_id, seller_org_id, title, unit, spec_snapshot, quantity, unit_paise, total_paise,
    payment_terms, credit_days, expected_delivery_on, consignee_name, consignee_gstin, delivery_address, settings_id
  ) values (
    private.next_order_no(private.financial_year()), p_product_id, v_buyer.id, v_product.seller_org_id, v_product.title,
    v_product.unit, coalesce((
      select jsonb_agg(jsonb_build_object('label', d.label, 'value', coalesce(v.value_text, v.value_number::text), 'unit', d.unit)
        order by d.is_key desc, d.label)
      from public.product_spec_values v
      join public.spec_definitions d on d.id = v.spec_definition_id
      where v.product_id = p_product_id
    ), '[]'::jsonb), p_quantity, v_product.net_paise, (v_amounts ->> 'valuePaise')::bigint, p_payment_terms,
    case when p_payment_terms = 'credit' then p_credit_days end, p_expected_delivery_on, trim(p_consignee_name),
    nullif(trim(p_consignee_gstin), ''), jsonb_build_object('line1', v_address.line1, 'line2', v_address.line2,
      'city', v_address.city, 'stateCode', v_address.state_code, 'pincode', v_address.pincode), v_settings.id
  ) returning id into v_order_id;
  perform private.order_event(v_order_id, 'unpaid', 'Order created');

  v_charge_id := private.create_order_charge(v_order_id, v_buyer.id, 'direct_buyer');
  return jsonb_build_object('orderId', v_order_id, 'chargeId', v_charge_id);
end;
$$;

create function private.cancel_order(p_order public.orders, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_charge_id uuid;
begin
  update public.orders set status = 'cancelled' where id = p_order.id;
  update public.products set stock_qty = stock_qty + p_order.quantity where id = p_order.product_id;
  perform private.order_event(p_order.id, 'cancelled', p_note);
  for v_charge_id in select id from public.fee_charges where order_id = p_order.id loop
    perform private.release_charge(v_charge_id);
  end loop;
  perform private.notify_org(p_order.buyer_org_id, 'order_update', 'order_cancelled:' || p_order.id,
    jsonb_build_object('orderNo', p_order.order_no, 'status', 'cancelled'));
  if p_order.status <> 'unpaid' then
    perform private.notify_org(p_order.seller_org_id, 'order_update', 'order_cancelled:' || p_order.id,
      jsonb_build_object('orderNo', p_order.order_no, 'status', 'cancelled'));
  end if;
end;
$$;

create function private.party_order(p_id uuid, p_side text) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_order public.orders;
begin
  select * into v_order from public.orders
  where id = p_id and v_org.id = case when p_side = 'buyer' then buyer_org_id else seller_org_id end
  for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return v_order;
end;
$$;

create function public.cancel_order(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders := private.party_order(p_id, 'buyer');
begin
  if v_order.status not in ('unpaid', 'awaiting_seller') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.cancel_order(v_order, 'Cancelled by buyer: ' || left(trim(p_reason), 300));
end;
$$;

create function public.reject_order(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders := private.party_order(p_id, 'seller');
begin
  if v_order.status <> 'awaiting_seller' or nullif(trim(p_reason), '') is null then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.cancel_order(v_order, 'Rejected by seller: ' || left(trim(p_reason), 300));
end;
$$;

create function public.accept_order(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders := private.party_order(p_id, 'seller');
  v_charge_id uuid;
begin
  if v_order.status <> 'awaiting_seller' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  select id into v_charge_id from public.fee_charges where order_id = p_id and kind = 'direct_seller';
  if found then
    return v_charge_id;
  end if;
  return private.create_order_charge(p_id, v_order.seller_org_id, 'direct_seller');
end;
$$;

create function public.register_order_file(p_path text, p_mime_type text, p_size_bytes bigint, p_sha256 text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_id uuid;
begin
  if split_part(p_path, '/', 1) <> v_org.id::text or p_mime_type not in ('application/pdf', 'image/webp') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  -- Re-encoded images carry only pixels. PDFs wait for the scanner chosen under A-2.
  insert into public.files (bucket, path, owner_org_id, uploaded_by, mime_type, size_bytes, sha256, scan_status)
  values ('order-documents', p_path, v_org.id, auth.uid(), p_mime_type, p_size_bytes, p_sha256,
    case when p_mime_type = 'image/webp' then 'clean' else 'pending' end::public.file_scan_status)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.dispatch_order(p_id uuid, p_documents jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders := private.party_order(p_id, 'seller');
begin
  if v_order.status <> 'accepted' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if exists (
    select from jsonb_array_elements(p_documents) as item
    where (item ->> 'fileId') is not null and not exists (
      select from public.files f
      where f.id = (item ->> 'fileId')::uuid and f.owner_org_id = v_order.seller_org_id
    )
  ) or (
    select count(distinct item ->> 'kind') from jsonb_array_elements(p_documents) as item
    where item ->> 'kind' in ('product_bill', 'eway_bill', 'transport_bill')
  ) <> 3 or jsonb_array_length(p_documents) <> 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  begin
    insert into public.order_documents (order_id, kind, file_id, reference_no, not_applicable_reason)
    select p_id, item ->> 'kind', (item ->> 'fileId')::uuid, nullif(trim(item ->> 'referenceNo'), ''),
      nullif(trim(item ->> 'notApplicableReason'), '')
    from jsonb_array_elements(p_documents) as item;
  exception when check_violation then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end;
  update public.orders set status = 'dispatched' where id = p_id;
  perform private.order_event(p_id, 'dispatched', 'Seller dispatched the order');
  perform private.notify_org(v_order.buyer_org_id, 'order_update', 'order_dispatched:' || p_id,
    jsonb_build_object('orderNo', v_order.order_no, 'status', 'dispatched'));
end;
$$;

create function public.receive_order(p_id uuid, p_file_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders := private.party_order(p_id, 'buyer');
  v_charge_id uuid;
begin
  if v_order.status <> 'dispatched' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if not exists (
    select from public.files
    where id = p_file_id and owner_org_id = v_order.buyer_org_id and mime_type = 'image/webp'
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.order_documents (order_id, kind, file_id) values (p_id, 'delivery_proof', p_file_id);
  update public.orders set status = 'completed' where id = p_id;
  update public.products set order_count = order_count + 1 where id = v_order.product_id;
  perform private.order_event(p_id, 'completed', 'Buyer confirmed receipt');
  for v_charge_id in select id from public.fee_charges where order_id = p_id loop
    perform private.finish_charge(v_charge_id);
  end loop;
  perform private.notify_org(v_order.seller_org_id, 'order_update', 'order_completed:' || p_id,
    jsonb_build_object('orderNo', v_order.order_no, 'status', 'completed'));
end;
$$;

-- Unpaid orders give their stock back after a day.
create function public.expire_unpaid_orders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_count integer := 0;
begin
  for v_order in
    select * from public.orders where status = 'unpaid' and created_at < now() - interval '1 day'
    for update skip locked
  loop
    perform private.cancel_order(v_order, 'Cancelled because the fee was not paid in time');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create function public.list_orders(p_limit integer default 20, p_offset integer default 0) returns table (
  id uuid, order_no text, title text, quantity numeric, unit text, total_paise bigint,
  status public.order_status, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.order_no, o.title, o.quantity, o.unit, o.total_paise, o.status, o.created_at
  from public.orders o
  where public.current_org_id() in (o.buyer_org_id, o.seller_org_id)
  order by o.created_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

-- Consignee and full address stay hidden from the seller until the contacts unlock.
create function public.get_order(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org_id uuid := public.current_org_id();
  v_order public.orders;
  v_side text;
  v_unlocked boolean;
  v_show_delivery boolean;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  select * into v_order from public.orders where id = p_id;
  if not found or (v_org_id is distinct from v_order.buyer_org_id and v_org_id is distinct from v_order.seller_org_id and not public.is_admin()) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  v_side := case when v_org_id = v_order.buyer_org_id then 'buyer' when v_org_id = v_order.seller_org_id then 'seller' else 'admin' end;
  v_unlocked := v_order.contacts_unlocked_at is not null;
  v_show_delivery := v_unlocked or v_side <> 'seller';
  return jsonb_build_object(
    'id', v_order.id, 'orderNo', v_order.order_no, 'side', v_side, 'status', v_order.status,
    'title', v_order.title, 'unit', v_order.unit, 'quantity', v_order.quantity,
    'unitPaise', v_order.unit_paise, 'totalPaise', v_order.total_paise, 'specs', v_order.spec_snapshot,
    'paymentTerms', v_order.payment_terms, 'creditDays', v_order.credit_days,
    'expectedDeliveryOn', v_order.expected_delivery_on, 'createdAt', v_order.created_at,
    'deliveryCity', v_order.delivery_address ->> 'city', 'deliveryStateCode', v_order.delivery_address ->> 'stateCode',
    'consigneeName', case when v_show_delivery then v_order.consignee_name end,
    'consigneeGstin', case when v_show_delivery then v_order.consignee_gstin end,
    'deliveryAddress', case when v_show_delivery then concat_ws(', ', v_order.delivery_address ->> 'line1',
      v_order.delivery_address ->> 'line2', v_order.delivery_address ->> 'city', v_order.delivery_address ->> 'pincode') end,
    'contactsUnlocked', v_unlocked,
    'charge', (
      select jsonb_build_object('id', c.id, 'status', c.status, 'feePaise', c.fee_paise,
        'gstPaise', c.cgst_paise + c.sgst_paise + c.igst_paise, 'totalPaise', c.total_paise)
      from public.fee_charges c where c.order_id = p_id and c.org_id = v_org_id
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'createdAt', e.created_at) order by e.id), '[]'::jsonb)
      from public.order_events e where e.order_id = p_id
    ),
    'documents', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', d.kind, 'referenceNo', d.reference_no,
        'notApplicableReason', d.not_applicable_reason, 'path', f.path, 'scanStatus', f.scan_status,
        'readable', f.scan_status = 'clean' or f.owner_org_id = v_org_id) order by d.kind), '[]'::jsonb)
      from public.order_documents d left join public.files f on f.id = d.file_id
      where d.order_id = p_id
    )
  );
end;
$$;

create function public.get_order_contacts(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org_id uuid := public.current_org_id();
  v_order public.orders;
  v_other_id uuid;
begin
  select * into v_order from public.orders where id = p_id;
  if not found or v_org_id is null or v_org_id not in (v_order.buyer_org_id, v_order.seller_org_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_order.contacts_unlocked_at is null then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  v_other_id := case when v_org_id = v_order.buyer_org_id then v_order.seller_org_id else v_order.buyer_org_id end;
  return (
    select jsonb_build_object('legalName', o.legal_name, 'gstin', o.gstin, 'contactName', p.full_name,
      'phone', p.phone, 'email', p.email,
      'address', concat_ws(', ', a.line1, a.line2, a.city, a.pincode))
    from public.organisations o
    left join lateral (
      select full_name, phone, email from public.profiles where org_id = o.id order by created_at limit 1
    ) p on true
    left join public.org_addresses a on a.org_id = o.id and a.is_registered
    where o.id = v_other_id
  );
end;
$$;

revoke all on function public.quote_order, public.create_order, public.cancel_order, public.reject_order,
  public.accept_order, public.register_order_file, public.dispatch_order, public.receive_order,
  public.expire_unpaid_orders, public.list_orders, public.get_order, public.get_order_contacts
  from public, anon, authenticated;
grant execute on function public.quote_order, public.create_order, public.cancel_order, public.reject_order,
  public.accept_order, public.register_order_file, public.dispatch_order, public.receive_order,
  public.list_orders, public.get_order, public.get_order_contacts to authenticated;
grant execute on function public.expire_unpaid_orders to service_role;
