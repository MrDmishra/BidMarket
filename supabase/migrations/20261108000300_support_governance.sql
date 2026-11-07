-- Support and governance: incidents, tickets, message threads, penalties, admin actions and auction pause.
create type public.incident_status as enum ('open', 'decided', 'closed');
create type public.ticket_type as enum ('account', 'payment', 'tender', 'order', 'technical', 'other');
create type public.ticket_status as enum ('open', 'resolved');

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique,
  raised_by_org_id uuid not null references public.organisations (id),
  raised_by uuid not null references auth.users (id),
  against_org_id uuid references public.organisations (id),
  product_id uuid references public.products (id),
  tender_id uuid references public.tenders (id),
  order_id uuid references public.orders (id),
  description text not null check (char_length(description) between 10 and 2000),
  status public.incident_status not null default 'open',
  decision text,
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint incidents_need_a_reference check (num_nonnulls(product_id, tender_id, order_id) = 1)
);
create index incidents_open_idx on public.incidents (status) where status = 'open';
create index incidents_raised_by_idx on public.incidents (raised_by_org_id);
create index incidents_against_idx on public.incidents (against_org_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ref_no text not null unique,
  user_id uuid not null references auth.users (id),
  org_id uuid references public.organisations (id),
  type public.ticket_type not null,
  subcategory text,
  description text not null check (char_length(description) between 10 and 2000),
  status public.ticket_status not null default 'open',
  resolution text,
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index tickets_open_idx on public.tickets (status) where status = 'open';
create index tickets_user_idx on public.tickets (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents (id),
  ticket_id uuid references public.tickets (id),
  author_id uuid not null references auth.users (id),
  from_support boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint messages_one_thread check (num_nonnulls(incident_id, ticket_id) = 1)
);
create index messages_incident_idx on public.messages (incident_id, created_at);
create index messages_ticket_idx on public.messages (ticket_id, created_at);
create trigger messages_append_only before update or delete on public.messages
  for each row execute function public.reject_change();

create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  tender_id uuid references public.tenders (id),
  strike_no integer,
  days integer check (days > 0),
  ends_at timestamptz not null,
  reason text not null,
  applied_by uuid references auth.users (id),
  waived_by uuid references auth.users (id),
  waived_reason text,
  waived_at timestamptz,
  created_at timestamptz not null default now()
);
create index penalties_org_idx on public.penalties (org_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.tenders add column paused_at timestamptz;

-- Parties read their own records. Every write goes through the functions below.
alter table public.incidents enable row level security;
alter table public.tickets enable row level security;
alter table public.messages enable row level security;
alter table public.penalties enable row level security;
create policy incidents_party_read on public.incidents for select to authenticated
  using (raised_by_org_id = public.current_org_id() or against_org_id = public.current_org_id() or public.is_admin());
create policy tickets_own_read on public.tickets for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy messages_thread_read on public.messages for select to authenticated
  using (
    public.is_admin()
    or exists (select from public.tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or exists (
      select from public.incidents i where i.id = incident_id
        and (i.raised_by_org_id = public.current_org_id() or i.against_org_id = public.current_org_id())
    )
  );
create policy penalties_own_read on public.penalties for select to authenticated
  using (org_id = public.current_org_id() or public.is_admin());
grant select on public.incidents, public.tickets, public.messages, public.penalties to authenticated;

create function private.next_ref(p_name text, p_label text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_value bigint;
  v_year text := private.financial_year();
begin
  insert into public.number_sequences (name, financial_year, next_value)
  values (p_name, v_year, 2)
  on conflict (name, financial_year) do update set next_value = public.number_sequences.next_value + 1
  returning next_value - 1 into v_value;
  return 'BM/' || substr(v_year, 3, 2) || '/' || p_label || '/' || lpad(v_value::text, 5, '0');
end;
$$;

-- Every admin write states why, so the audit log can answer "who did this and why".
create function private.require_reason(p_reason text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  return left(trim(p_reason), 500);
end;
$$;

create function private.audit_support(p_org_id uuid, p_entity_type text, p_entity_id uuid, p_action text, p_reason text default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_role, org_id, action, entity_type, entity_id, reason)
  values (auth.uid(), case when public.is_admin() then 'admin' else 'org_user' end, p_org_id, p_action,
    p_entity_type, p_entity_id::text, p_reason);
$$;

-- Incidents

-- The caller must be a party to the reference. The other party is recorded but never shown by name.
create function public.raise_incident(p_order_id uuid, p_tender_id uuid, p_product_id uuid, p_description text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations := private.billing_org();
  v_against uuid;
  v_id uuid;
begin
  if num_nonnulls(p_order_id, p_tender_id, p_product_id) <> 1
    or char_length(trim(coalesce(p_description, ''))) not between 10 and 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  if p_order_id is not null then
    select case when buyer_org_id = v_org.id then seller_org_id else buyer_org_id end into v_against
    from public.orders where id = p_order_id and v_org.id in (buyer_org_id, seller_org_id);
  elsif p_tender_id is not null then
    -- A buyer's complaint about a tender names no seller, so no seller identity is exposed.
    select case when t.buyer_org_id = v_org.id then null else t.buyer_org_id end into v_against
    from public.tenders t
    where t.id = p_tender_id and (t.buyer_org_id = v_org.id or exists (
      select from public.tender_participants p where p.tender_id = t.id and p.seller_org_id = v_org.id
    ));
  else
    select seller_org_id into v_against from public.products
    where id = p_product_id and status = 'published' and seller_org_id <> v_org.id;
  end if;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.incidents (ref_no, raised_by_org_id, raised_by, against_org_id, product_id, tender_id, order_id, description)
  values (private.next_ref('incident', 'INC'), v_org.id, auth.uid(), v_against, p_product_id, p_tender_id, p_order_id,
    trim(p_description))
  returning id into v_id;
  perform private.audit_support(v_org.id, 'incident', v_id, 'incident.raised');
  if v_against is not null then
    perform private.notify_org(v_against, 'support_update', 'incident_raised:' || v_id,
      jsonb_build_object('refNo', (select ref_no from public.incidents where id = v_id)));
  end if;
  return v_id;
end;
$$;

create function private.incident_role(p_incident public.incidents) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then 'support'
    when p_incident.raised_by_org_id = public.current_org_id() then 'raiser'
    when p_incident.against_org_id = public.current_org_id() then 'other_party'
  end;
$$;

create function public.my_incidents() returns table (
  id uuid, ref_no text, status public.incident_status, raised_by_me boolean, reference text, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select i.id, i.ref_no, i.status, i.raised_by_org_id = public.current_org_id(),
    coalesce(o.order_no, t.tender_no, p.title), i.created_at
  from public.incidents i
  left join public.orders o on o.id = i.order_id
  left join public.tenders t on t.id = i.tender_id
  left join public.products p on p.id = i.product_id
  where public.current_org_id() in (i.raised_by_org_id, i.against_org_id)
  order by i.created_at desc limit 100;
$$;

-- Authors are shown by role only: you, the other party, or Bid Market support.
create function private.thread(p_incident_id uuid, p_ticket_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'body', m.body, 'createdAt', m.created_at,
    'author', case when m.from_support then 'support' when m.author_id = auth.uid() then 'you'
      when m.ticket_id is not null then 'you'
      when (select org_id from public.profiles where user_id = m.author_id) = public.current_org_id() then 'your_team'
      else 'other_party' end
  ) order by m.created_at), '[]'::jsonb)
  from public.messages m
  where (p_incident_id is not null and m.incident_id = p_incident_id) or (p_ticket_id is not null and m.ticket_id = p_ticket_id);
$$;

create function public.get_incident(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_incident public.incidents;
  v_role text;
begin
  select * into v_incident from public.incidents where id = p_id;
  v_role := case when found then private.incident_role(v_incident) end;
  if v_role is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'id', v_incident.id, 'refNo', v_incident.ref_no, 'status', v_incident.status, 'role', v_role,
    'description', v_incident.description, 'decision', v_incident.decision, 'decidedAt', v_incident.decided_at,
    'createdAt', v_incident.created_at, 'orderId', v_incident.order_id, 'tenderId', v_incident.tender_id,
    'productId', v_incident.product_id,
    'reference', coalesce(
      (select order_no from public.orders where id = v_incident.order_id),
      (select tender_no from public.tenders where id = v_incident.tender_id),
      (select title from public.products where id = v_incident.product_id)),
    'raisedBy', case when public.is_admin() then (select legal_name from public.organisations where id = v_incident.raised_by_org_id) end,
    'against', case when public.is_admin() then (select legal_name from public.organisations where id = v_incident.against_org_id) end,
    'messages', private.thread(p_id, null)
  );
end;
$$;

create function public.add_incident_message(p_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_incident public.incidents;
  v_role text;
  v_id uuid;
begin
  select * into v_incident from public.incidents where id = p_id;
  v_role := case when found then private.incident_role(v_incident) end;
  if v_role is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_incident.status = 'closed' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.messages (incident_id, author_id, from_support, body)
  values (p_id, auth.uid(), v_role = 'support', trim(p_body)) returning id into v_id;
  perform private.notify_org(org_id, 'support_update', 'incident_message:' || v_id,
    jsonb_build_object('refNo', v_incident.ref_no))
  from unnest(array[v_incident.raised_by_org_id, v_incident.against_org_id]) as org_id
  where org_id is not null and org_id is distinct from public.current_org_id();
  return v_id;
end;
$$;

-- Tickets

create function public.raise_ticket(p_type public.ticket_type, p_subcategory text, p_description text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = 'P0001';
  end if;
  if p_type is null or char_length(trim(coalesce(p_description, ''))) not between 10 and 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.tickets (ref_no, user_id, org_id, type, subcategory, description)
  values (private.next_ref('ticket', 'TKT'), auth.uid(), public.current_org_id(), p_type,
    nullif(left(trim(coalesce(p_subcategory, '')), 80), ''), trim(p_description))
  returning id into v_id;
  perform private.audit_support(public.current_org_id(), 'ticket', v_id, 'ticket.raised');
  return v_id;
end;
$$;

create function public.my_tickets() returns table (
  id uuid, ref_no text, type public.ticket_type, status public.ticket_status, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select id, ref_no, type, status, created_at from public.tickets
  where user_id = auth.uid() order by created_at desc limit 100;
$$;

create function public.get_ticket(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets where id = p_id and (user_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'id', v_ticket.id, 'refNo', v_ticket.ref_no, 'type', v_ticket.type, 'subcategory', v_ticket.subcategory,
    'status', v_ticket.status, 'description', v_ticket.description, 'resolution', v_ticket.resolution,
    'resolvedAt', v_ticket.resolved_at, 'createdAt', v_ticket.created_at,
    'raisedBy', case when public.is_admin() then (select email from public.profiles where user_id = v_ticket.user_id) end,
    'messages', private.thread(null, p_id)
  );
end;
$$;

create function public.add_ticket_message(p_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
  v_id uuid;
begin
  select * into v_ticket from public.tickets where id = p_id and (user_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  -- A reply from the user reopens a resolved ticket.
  if v_ticket.status = 'resolved' and not public.is_admin() then
    update public.tickets set status = 'open' where id = p_id;
  end if;
  insert into public.messages (ticket_id, author_id, from_support, body)
  values (p_id, auth.uid(), public.is_admin(), trim(p_body)) returning id into v_id;
  if public.is_admin() then
    insert into public.outbox (template, recipient_user_id, payload, dedupe_key)
    values ('support_update', v_ticket.user_id, jsonb_build_object('refNo', v_ticket.ref_no), 'ticket_message:' || v_id)
    on conflict (dedupe_key) do nothing;
  end if;
  return v_id;
end;
$$;

-- Penalties: rejection strikes now leave a record that support can waive.
create or replace function private.apply_rejection_strike(p_org_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations;
  v_strikes integer;
  v_days integer;
  v_ends timestamptz;
begin
  select * into v_org from public.organisations where id = p_org_id for update;
  v_strikes := case when v_org.strikes_reset_at < now() - interval '12 months' then 0 else v_org.strike_count end + 1;
  v_days := case v_strikes when 1 then 30 when 2 then 60 when 3 then 180 end;
  v_ends := case when v_days is null then 'infinity'::timestamptz else now() + make_interval(days => v_days) end;
  update public.organisations set strike_count = v_strikes, strikes_reset_at = now(), blocked_until = v_ends
  where id = p_org_id;
  insert into public.penalties (org_id, strike_no, days, ends_at, reason)
  values (p_org_id, v_strikes, v_days, v_ends, 'Award rejected');
  perform private.audit_billing(p_org_id, p_org_id, 'seller.strike', jsonb_build_object('strikes', v_strikes));
end;
$$;

-- The block that stays is the longest one not waived and not over.
create function private.refresh_block(p_org_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.organisations set blocked_until = (
    select max(ends_at) from public.penalties where org_id = p_org_id and waived_at is null and ends_at > now()
  ) where id = p_org_id;
$$;

-- Admin

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'pendingOrganisations', (select count(*) from public.organisations where status = 'pending_review'),
    'pendingProducts', (select count(*) from public.products where status = 'pending'),
    'categoryRequests', (select count(*) from public.category_requests where status = 'pending'),
    'openIncidents', (select count(*) from public.incidents where status = 'open'),
    'openTickets', (select count(*) from public.tickets where status = 'open'),
    'liveAuctions', (select count(*) from public.tenders where status = 'auction'),
    'pausedAuctions', (select count(*) from public.tenders where paused_at is not null),
    'openTenders', (select count(*) from public.tenders where status in ('bidding', 'shortlisting', 'auction_scheduled', 'auction', 'evaluating', 'awarding')),
    'activeOrders', (select count(*) from public.orders where status in ('awaiting_seller', 'accepted', 'dispatched')),
    'blockedSellers', (select count(*) from public.organisations where blocked_until > now()),
    'feesPaidPaise', (select coalesce(sum(fee_paise), 0) from public.fee_charges where status = 'paid')
  );
end;
$$;

create function public.admin_organisations(p_search text default null, p_status public.org_status default null)
returns table (id uuid, legal_name text, kind public.org_kind, status public.org_status, gstin text,
  strike_count integer, blocked_until timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select o.id, o.legal_name, o.kind, o.status, o.gstin, o.strike_count, o.blocked_until, o.created_at
    from public.organisations o
    where (p_status is null or o.status = p_status)
      and (nullif(trim(p_search), '') is null or o.legal_name ilike '%' || trim(p_search) || '%' or o.gstin ilike trim(p_search) || '%')
    order by o.created_at desc limit 100;
end;
$$;

-- Opening an organisation is logged, because the page shows identity details.
create function public.admin_organisation(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organisations;
begin
  perform private.require_admin();
  select * into v_org from public.organisations where id = p_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  perform private.audit(p_id, 'organisation.viewed');
  return jsonb_build_object(
    'id', v_org.id, 'legalName', v_org.legal_name, 'kind', v_org.kind, 'entityType', v_org.entity_type,
    'status', v_org.status, 'gstin', v_org.gstin, 'strikeCount', v_org.strike_count, 'blockedUntil', v_org.blocked_until,
    'maintenance', v_org.maintenance, 'createdAt', v_org.created_at,
    'users', (select coalesce(jsonb_agg(jsonb_build_object('email', email) order by email), '[]'::jsonb)
      from public.profiles where org_id = p_id),
    'penalties', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'strikeNo', strike_no, 'days', days,
      'endsAt', ends_at, 'reason', reason, 'waivedAt', waived_at, 'waivedReason', waived_reason) order by created_at desc), '[]'::jsonb)
      from public.penalties where org_id = p_id)
  );
end;
$$;

create function public.admin_set_org_status(p_id uuid, p_action text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_org public.organisations;
begin
  perform private.require_admin();
  select * into v_org from public.organisations where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_action = 'suspend' and v_org.status = 'active' then
    update public.organisations set status = 'suspended' where id = p_id;
  elsif p_action = 'reinstate' and v_org.status = 'suspended' then
    update public.organisations set status = 'active' where id = p_id;
  else
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.audit(p_id, 'organisation.' || p_action, jsonb_build_object('from', v_org.status), v_reason);
  perform private.notify_org(p_id, 'account_update', 'org_' || p_action || ':' || p_id || ':' || extract(epoch from now())::bigint,
    jsonb_build_object('status', case when p_action = 'suspend' then 'suspended' else 'active' end));
end;
$$;

-- A null day count blocks permanently.
create function public.admin_block_org(p_id uuid, p_days integer, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_id uuid;
begin
  perform private.require_admin();
  if not exists (select from public.organisations where id = p_id) or (p_days is not null and p_days not between 1 and 3650) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  insert into public.penalties (org_id, days, ends_at, reason, applied_by)
  values (p_id, p_days, case when p_days is null then 'infinity'::timestamptz else now() + make_interval(days => p_days) end,
    v_reason, auth.uid())
  returning id into v_id;
  perform private.refresh_block(p_id);
  perform private.audit(p_id, 'organisation.blocked', jsonb_build_object('days', p_days), v_reason);
  return v_id;
end;
$$;

create function public.admin_waive_penalty(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_penalty public.penalties;
begin
  perform private.require_admin();
  select * into v_penalty from public.penalties where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_penalty.waived_at is not null then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.penalties set waived_by = auth.uid(), waived_reason = v_reason, waived_at = now() where id = p_id;
  -- A waived strike no longer counts towards the next, longer block.
  if v_penalty.strike_no is not null then
    update public.organisations set strike_count = greatest(strike_count - 1, 0) where id = v_penalty.org_id;
  end if;
  perform private.refresh_block(v_penalty.org_id);
  perform private.audit(v_penalty.org_id, 'penalty.waived', jsonb_build_object('penaltyId', p_id), v_reason);
end;
$$;

-- Lifting a block waives every penalty still running.
create function public.admin_lift_block(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  update public.penalties set waived_by = auth.uid(), waived_reason = v_reason, waived_at = now()
  where org_id = p_id and waived_at is null and ends_at > now();
  update public.organisations set blocked_until = null where id = p_id;
  perform private.audit(p_id, 'organisation.block_lifted', null, v_reason);
end;
$$;

create function public.admin_incidents(p_status public.incident_status default 'open') returns table (
  id uuid, ref_no text, status public.incident_status, reference text, raised_by text, against text, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select i.id, i.ref_no, i.status, coalesce(o.order_no, t.tender_no, p.title), r.legal_name, a.legal_name, i.created_at
    from public.incidents i
    join public.organisations r on r.id = i.raised_by_org_id
    left join public.organisations a on a.id = i.against_org_id
    left join public.orders o on o.id = i.order_id
    left join public.tenders t on t.id = i.tender_id
    left join public.products p on p.id = i.product_id
    where p_status is null or i.status = p_status
    order by i.created_at limit 100;
end;
$$;

create function public.admin_decide_incident(p_id uuid, p_decision text, p_close boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_incident public.incidents;
begin
  perform private.require_admin();
  select * into v_incident from public.incidents where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_incident.status = 'closed' or char_length(trim(coalesce(p_decision, ''))) not between 3 and 2000 then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.incidents set decision = trim(p_decision), decided_by = auth.uid(), decided_at = now(),
    status = case when p_close then 'closed' else 'decided' end::public.incident_status
  where id = p_id;
  perform private.audit_support(v_incident.raised_by_org_id, 'incident', p_id, 'incident.decided', v_reason);
  perform private.notify_org(org_id, 'support_update', 'incident_decided:' || p_id || ':' || extract(epoch from now())::bigint,
    jsonb_build_object('refNo', v_incident.ref_no))
  from unnest(array[v_incident.raised_by_org_id, v_incident.against_org_id]) as org_id
  where org_id is not null;
end;
$$;

create function public.admin_tickets(p_status public.ticket_status default 'open') returns table (
  id uuid, ref_no text, type public.ticket_type, status public.ticket_status, email text, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select t.id, t.ref_no, t.type, t.status, pr.email, t.created_at
    from public.tickets t left join public.profiles pr on pr.user_id = t.user_id
    where p_status is null or t.status = p_status
    order by t.created_at limit 100;
end;
$$;

create function public.admin_resolve_ticket(p_id uuid, p_resolution text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_ticket public.tickets;
begin
  perform private.require_admin();
  select * into v_ticket from public.tickets where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_ticket.status <> 'open' or char_length(trim(coalesce(p_resolution, ''))) not between 3 and 2000 then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.tickets set status = 'resolved', resolution = trim(p_resolution), resolved_by = auth.uid(), resolved_at = now()
  where id = p_id;
  perform private.audit_support(v_ticket.org_id, 'ticket', p_id, 'ticket.resolved', v_reason);
  insert into public.outbox (template, recipient_user_id, payload, dedupe_key)
  values ('support_update', v_ticket.user_id, jsonb_build_object('refNo', v_ticket.ref_no), 'ticket_resolved:' || p_id || ':' || extract(epoch from now())::bigint)
  on conflict (dedupe_key) do nothing;
end;
$$;

create function public.admin_tenders(p_status public.tender_status default null) returns table (
  id uuid, tender_no text, type public.tender_type, title text, buyer text, status public.tender_status,
  bid_ends_at timestamptz, paused_at timestamptz, bid_count integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select t.id, t.tender_no, t.type, t.title, o.legal_name, t.status, t.bid_ends_at, t.paused_at,
      (select count(*)::integer from public.tender_participants p where p.tender_id = t.id and p.last_bid_paise is not null)
    from public.tenders t join public.organisations o on o.id = t.buyer_org_id
    where p_status is null or t.status = p_status
    order by t.created_at desc limit 100;
end;
$$;

create function public.admin_cancel_tender(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_tender public.tenders;
begin
  perform private.require_admin();
  select * into v_tender from public.tenders where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_tender.status in ('ordered', 'cancelled') then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.cancel_tender(p_id, 'Cancelled by Bid Market: ' || v_reason);
  perform private.audit_admin('tender', p_id::text, 'tender.cancelled', v_reason);
end;
$$;

-- Pausing stops bids and the clock. Resuming adds back the time lost, so sellers keep their full window.
create function public.admin_pause_auction(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
begin
  perform private.require_admin();
  update public.tenders set paused_at = now(), seq = seq + 1
  where id = p_id and type <> 'bid' and status in ('auction_scheduled', 'auction') and paused_at is null;
  if not found then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  perform private.audit_admin('tender', p_id::text, 'auction.paused', v_reason);
end;
$$;

create function public.admin_resume_auction(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_tender public.tenders;
  v_lost interval;
begin
  perform private.require_admin();
  select * into v_tender from public.tenders where id = p_id and paused_at is not null for update;
  if not found then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  -- At least 5 minutes remain after a resume, so nobody loses the auction to the pause itself.
  v_lost := greatest(now() - v_tender.paused_at, interval '0')
    + greatest(interval '5 minutes' - (v_tender.ra_ends_at - v_tender.paused_at), interval '0');
  update public.tenders set paused_at = null, seq = seq + 1,
    ra_starts_at = case when ra_starts_at > v_tender.paused_at then ra_starts_at + v_lost else ra_starts_at end,
    ra_ends_at = ra_ends_at + v_lost, bid_ends_at = bid_ends_at + v_lost
  where id = p_id;
  perform private.audit_admin('tender', p_id::text, 'auction.resumed', v_reason);
end;
$$;

create function public.admin_orders(p_status public.order_status default null) returns table (
  id uuid, order_no text, title text, buyer text, seller text, status public.order_status, total_paise bigint, created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select o.id, o.order_no, o.title, b.legal_name, s.legal_name, o.status, o.total_paise, o.created_at
    from public.orders o
    join public.organisations b on b.id = o.buyer_org_id
    join public.organisations s on s.id = o.seller_org_id
    where p_status is null or o.status = p_status
    order by o.created_at desc limit 100;
end;
$$;

create function public.admin_audit_log(
  p_entity_type text default null, p_entity_id text default null, p_action text default null, p_before bigint default null
) returns table (
  id bigint, created_at timestamptz, actor text, actor_role text, action text, entity_type text, entity_id text, reason text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select a.id, a.created_at, coalesce(pr.email, a.actor_role), a.actor_role, a.action, a.entity_type, a.entity_id, a.reason
    from public.audit_log a left join public.profiles pr on pr.user_id = a.actor_id
    where (nullif(p_entity_type, '') is null or a.entity_type = p_entity_type)
      and (nullif(p_entity_id, '') is null or a.entity_id = p_entity_id)
      and (nullif(p_action, '') is null or a.action ilike p_action || '%')
      and (p_before is null or a.id < p_before)
    order by a.id desc limit 50;
end;
$$;

-- What needs the caller's action, for the dashboards.
create function public.my_attention() returns table (kind text, id uuid, label text, due_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'tender_fee', t.id, t.tender_no || ': pay the fee to publish', null::timestamptz
  from public.tenders t where t.buyer_org_id = public.current_org_id() and t.status = 'unpaid'
  union all
  select 'tender_shortlist', t.id, t.tender_no || ': shortlist sellers for the auction', t.ra_starts_at
  from public.tenders t where t.buyer_org_id = public.current_org_id() and t.status = 'shortlisting'
  union all
  select 'tender_award', t.id, t.tender_no || ': choose a seller', null
  from public.tenders t where t.buyer_org_id = public.current_org_id() and t.status = 'evaluating'
  union all
  select 'award_offer', a.tender_id, t.tender_no || ': respond to your award', a.expires_at
  from public.tender_awards a join public.tenders t on t.id = a.tender_id
  where a.seller_org_id = public.current_org_id() and a.status = 'offered'
  union all
  select 'order', o.id, o.order_no || ': accept or decline the order', null
  from public.orders o where o.seller_org_id = public.current_org_id() and o.status = 'awaiting_seller'
  union all
  select 'incident', i.id, i.ref_no || ': a reply is waiting', null
  from public.incidents i
  where i.status <> 'closed' and public.current_org_id() in (i.raised_by_org_id, i.against_org_id)
    and (select m.author_id from public.messages m where m.incident_id = i.id order by m.created_at desc limit 1)
      is distinct from auth.uid()
    and exists (select from public.messages m where m.incident_id = i.id)
  order by 4 nulls last
  limit 20;
$$;

-- Paused auctions refuse bids, and the deadline job leaves them alone.
create or replace function public.place_ra_bid(p_id uuid, p_unit_paise bigint, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_seller public.organisations := private.billing_org();
  v_tender public.tenders;
  v_settings public.platform_settings;
  v_bid public.bids;
  v_now timestamptz;
  v_max_allowed bigint;
  v_extend boolean;
  v_rank bigint;
begin
  if p_unit_paise <= 0 or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_tender from public.tenders where id = p_id for update;
  if not found or v_tender.type = 'bid' then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- A retry returns the first result, even after the auction closes.
  select * into v_bid from public.bids where seller_org_id = v_seller.id and idempotency_key = p_idempotency_key;
  if not found then
    v_now := clock_timestamp();
    if v_tender.paused_at is not null then
      raise exception 'AUCTION_PAUSED' using errcode = 'P0001';
    end if;
    if v_tender.status not in ('auction_scheduled', 'auction') or v_now < v_tender.ra_starts_at or v_now >= v_tender.ra_ends_at then
      raise exception 'AUCTION_CLOSED' using errcode = 'P0001';
    end if;
    if not private.seller_can_auction(v_seller, v_tender) then
      raise exception 'NOT_ELIGIBLE' using errcode = 'P0001';
    end if;
    select * into v_settings from public.platform_settings where id = v_tender.settings_id;
    v_max_allowed := v_tender.l1_paise - ceil(v_tender.l1_paise * v_settings.decrement_bps / 10000.0)::bigint;
    if p_unit_paise > v_max_allowed then
      raise exception 'BID_TOO_HIGH' using errcode = 'P0001';
    end if;

    insert into public.bids (tender_id, seller_org_id, phase, unit_paise, idempotency_key, placed_at)
    values (p_id, v_seller.id, 'auction', p_unit_paise, p_idempotency_key, v_now)
    returning * into v_bid;
    insert into public.tender_participants (tender_id, seller_org_id, last_bid_paise, last_bid_at)
    values (p_id, v_seller.id, p_unit_paise, v_now)
    on conflict (tender_id, seller_org_id) do update set last_bid_paise = excluded.last_bid_paise, last_bid_at = excluded.last_bid_at;

    v_extend := v_tender.ra_ends_at - v_now <= make_interval(mins => v_settings.snipe_window_minutes)
      and v_tender.snipe_extensions_used < v_settings.snipe_max;
    update public.tenders set
      status = 'auction', l1_paise = p_unit_paise, bid_count = bid_count + 1, seq = seq + 1,
      snipe_extensions_used = snipe_extensions_used + case when v_extend then 1 else 0 end,
      ra_ends_at = ra_ends_at + case when v_extend then make_interval(mins => v_settings.snipe_window_minutes) else interval '0' end,
      bid_ends_at = bid_ends_at + case when v_extend then make_interval(mins => v_settings.snipe_window_minutes) else interval '0' end
    where id = p_id returning * into v_tender;
  end if;

  select count(*) + 1 into v_rank from public.tender_participants
  where tender_id = p_id and last_bid_paise < v_bid.unit_paise and not withdrawn and eliminated_at is null;
  return jsonb_build_object('bidId', v_bid.id, 'unitPaise', v_bid.unit_paise, 'rank', v_rank,
    'l1Paise', v_tender.l1_paise, 'endsAt', v_tender.ra_ends_at, 'seq', v_tender.seq);
end;
$$;

create or replace function public.tick_tenders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_tender public.tenders;
  v_award public.tender_awards;
  v_charge_id uuid;
  v_changed integer := 0;
begin
  -- A buyer who misses the shortlist keeps every sealed bidder in the auction.
  for v_tender in
    select * from public.tenders where status = 'shortlisting' and ra_starts_at <= now()
    for update skip locked
  loop
    perform private.schedule_bid_to_ra(v_tender);
    v_changed := v_changed + 1;
  end loop;

  update public.tenders set status = 'auction', seq = seq + 1
  where status = 'auction_scheduled' and ra_starts_at <= now() and paused_at is null;

  for v_tender in
    select * from public.tenders
    where status in ('bidding', 'auction') and bid_ends_at <= now() and paused_at is null
    for update skip locked
  loop
    perform private.close_tender_bidding(v_tender);
    v_changed := v_changed + 1;
  end loop;

  for v_award in
    select * from public.tender_awards where status = 'offered' and expires_at <= now()
    for update skip locked
  loop
    update public.tender_awards set status = 'expired', responded_at = now() where id = v_award.id;
    select id into v_charge_id from public.fee_charges
    where tender_id = v_award.tender_id and kind = 'tender_seller' and org_id = v_award.seller_org_id;
    if found then
      perform private.release_charge(v_charge_id);
    end if;
    perform private.offer_next_award(v_award.tender_id);
    v_changed := v_changed + 1;
  end loop;

  for v_tender in
    select * from public.tenders where status = 'unpaid' and created_at < now() - interval '3 days'
    for update skip locked
  loop
    perform private.cancel_tender(v_tender.id, 'The fee was not paid in time');
    v_changed := v_changed + 1;
  end loop;
  return v_changed;
end;
$$;

create or replace function public.buyer_auction(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('status', t.status, 'bidCount', t.bid_count, 'startsAt', t.ra_starts_at,
    'endsAt', t.ra_ends_at, 'seq', t.seq, 'paused', t.paused_at is not null, 'serverNow', clock_timestamp())
  from public.tenders t
  where t.id = p_id and t.type <> 'bid' and t.buyer_org_id = public.current_org_id();
$$;

create or replace function public.seller_auction(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_org public.organisations;
  v_tender public.tenders;
  v_participant public.tender_participants;
  v_settings public.platform_settings;
  v_eligible boolean;
begin
  select * into v_org from public.organisations where id = public.current_org_id();
  select * into v_tender from public.tenders where id = p_id and type <> 'bid';
  if not found or v_org.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_participant from public.tender_participants where tender_id = p_id and seller_org_id = v_org.id;
  v_eligible := private.seller_can_auction(v_org, v_tender);
  if v_participant.seller_org_id is null and not (v_eligible and v_tender.status in ('auction_scheduled', 'auction')) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_settings from public.platform_settings where id = v_tender.settings_id;
  return jsonb_build_object(
    'status', v_tender.status, 'eligible', v_eligible, 'eliminated', v_participant.eliminated_at is not null,
    'paused', v_tender.paused_at is not null,
    'startsAt', v_tender.ra_starts_at, 'endsAt', v_tender.ra_ends_at,
    'serverNow', clock_timestamp(), 'seq', v_tender.seq, 'bidCount', v_tender.bid_count, 'l1Paise', v_tender.l1_paise,
    'maxAllowedPaise', v_tender.l1_paise - ceil(v_tender.l1_paise * v_settings.decrement_bps / 10000.0)::bigint,
    'myBidPaise', v_participant.last_bid_paise,
    'rank', case when v_participant.last_bid_paise is not null and v_participant.eliminated_at is null then (
      select count(*) + 1 from public.tender_participants
      where tender_id = p_id and last_bid_paise < v_participant.last_bid_paise and not withdrawn and eliminated_at is null
    ) end,
    'bidsPaise', (
      select coalesce(jsonb_agg(recent.unit_paise order by recent.placed_at), '[]'::jsonb)
      from (
        select unit_paise, placed_at from public.bids
        where tender_id = p_id and phase = 'auction' order by placed_at desc limit 30
      ) as recent
    )
  );
end;
$$;

revoke all on function public.raise_incident, public.my_incidents, public.get_incident, public.add_incident_message,
  public.raise_ticket, public.my_tickets, public.get_ticket, public.add_ticket_message, public.admin_overview,
  public.admin_organisations, public.admin_organisation, public.admin_set_org_status, public.admin_block_org,
  public.admin_waive_penalty, public.admin_lift_block, public.admin_incidents, public.admin_decide_incident,
  public.admin_tickets, public.admin_resolve_ticket, public.admin_tenders, public.admin_cancel_tender,
  public.admin_pause_auction, public.admin_resume_auction, public.admin_orders, public.admin_audit_log,
  public.my_attention from public, anon;
grant execute on function public.raise_incident, public.my_incidents, public.get_incident, public.add_incident_message,
  public.raise_ticket, public.my_tickets, public.get_ticket, public.add_ticket_message, public.admin_overview,
  public.admin_organisations, public.admin_organisation, public.admin_set_org_status, public.admin_block_org,
  public.admin_waive_penalty, public.admin_lift_block, public.admin_incidents, public.admin_decide_incident,
  public.admin_tickets, public.admin_resolve_ticket, public.admin_tenders, public.admin_cancel_tender,
  public.admin_pause_auction, public.admin_resume_auction, public.admin_orders, public.admin_audit_log,
  public.my_attention to authenticated;
