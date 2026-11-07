-- Until a malware scanner is connected, support opens each uploaded PDF and marks it clean or infected.
-- The other party can open a document only once it is clean, so this queue keeps orders moving.
create function public.admin_pending_files() returns table (
  id uuid, path text, mime_type text, size_bytes bigint, created_at timestamptz, order_id uuid, order_no text,
  kind text, owner text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select f.id, f.path, f.mime_type, f.size_bytes, f.created_at, o.id, o.order_no, d.kind, org.legal_name
    from public.files f
    join public.organisations org on org.id = f.owner_org_id
    left join public.order_documents d on d.file_id = f.id
    left join public.orders o on o.id = d.order_id
    where f.scan_status = 'pending'
    order by f.created_at limit 100;
end;
$$;

create function public.admin_review_file(p_id uuid, p_clean boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := private.require_reason(p_reason);
  v_file public.files;
begin
  perform private.require_admin();
  if p_clean is null then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;
  select * into v_file from public.files where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_file.scan_status <> 'pending' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;
  update public.files set scan_status = case when p_clean then 'clean' else 'infected' end::public.file_scan_status
  where id = p_id;
  perform private.audit_support(v_file.owner_org_id, 'file', p_id,
    case when p_clean then 'file.marked_clean' else 'file.marked_infected' end, v_reason);
end;
$$;

revoke all on function public.admin_pending_files, public.admin_review_file from public, anon;
grant execute on function public.admin_pending_files, public.admin_review_file to authenticated;
