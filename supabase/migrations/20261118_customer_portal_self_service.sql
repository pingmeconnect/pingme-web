-- PingMe customer portal self-service + mobile-change review + audit support
-- ADDITIVE migration. Review and back up before running. Run once only.
-- The earlier 20261118_customer_portal_link.sql migration must already be applied.

-- 1) Audit tables
create table if not exists public.pingme_customer_profile_audit (
  id uuid primary key default gen_random_uuid(),
  customer_row_id uuid not null references public.pingme_customers(id) on delete cascade,
  changed_by uuid,
  changed_fields jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now()
);

create table if not exists public.pingme_qr_actions (
  id uuid primary key default gen_random_uuid(),
  customer_row_id uuid not null references public.pingme_customers(id) on delete cascade,
  action text not null check (action in ('download','print')),
  performed_at timestamptz not null default now()
);

create table if not exists public.pingme_mobile_change_requests (
  id uuid primary key default gen_random_uuid(),
  customer_row_id uuid not null references public.pingme_customers(id) on delete cascade,
  old_mobile text not null,
  requested_mobile text not null,
  reason text,
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  admin_note text
);

create index if not exists pingme_mobile_change_requests_customer_idx
  on public.pingme_mobile_change_requests(customer_row_id, requested_at desc);
create index if not exists pingme_customer_profile_audit_customer_idx
  on public.pingme_customer_profile_audit(customer_row_id, changed_at desc);
create index if not exists pingme_qr_actions_customer_idx
  on public.pingme_qr_actions(customer_row_id, performed_at desc);

alter table public.pingme_customer_profile_audit enable row level security;
alter table public.pingme_qr_actions enable row level security;
alter table public.pingme_mobile_change_requests enable row level security;

drop policy if exists "PingMe admin reads mobile change requests" on public.pingme_mobile_change_requests;
create policy "PingMe admin reads mobile change requests"
  on public.pingme_mobile_change_requests for select to authenticated
  using ((auth.jwt() ->> 'email') = 'pingmeconnect@gmail.com');

drop policy if exists "PingMe admin reads customer profile audit" on public.pingme_customer_profile_audit;
create policy "PingMe admin reads customer profile audit"
  on public.pingme_customer_profile_audit for select to authenticated
  using ((auth.jwt() ->> 'email') = 'pingmeconnect@gmail.com');

drop policy if exists "PingMe admin reads QR actions" on public.pingme_qr_actions;
create policy "PingMe admin reads QR actions"
  on public.pingme_qr_actions for select to authenticated
  using ((auth.jwt() ->> 'email') = 'pingmeconnect@gmail.com');

-- 2) Claim exactly one existing customer by the authenticated, verified email.
create or replace function public.pingme_claim_customer_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  v_confirmed_at timestamptz;
  v_customer_id uuid;
  v_matches integer;
begin
  if v_user_id is null or v_email = '' then
    raise exception 'Verified sign-in required';
  end if;

  select email_confirmed_at into v_confirmed_at
  from auth.users where id = v_user_id;
  if v_confirmed_at is null then
    raise exception 'Verified email required';
  end if;

  select count(*) into v_matches
  from public.pingme_customers
  where lower(email) = v_email
    and (auth_user_id is null or auth_user_id = v_user_id);

  if v_matches = 0 then
    raise exception 'No unlinked PingMe customer account matches this email';
  elsif v_matches > 1 then
    raise exception 'Multiple PingMe customer records match this email. Contact admin';
  end if;

  select id into v_customer_id
  from public.pingme_customers
  where lower(email) = v_email
    and (auth_user_id is null or auth_user_id = v_user_id)
  for update;

  update public.pingme_customers
  set auth_user_id = v_user_id, updated_at = now()
  where id = v_customer_id;

  return jsonb_build_object('customer_id', v_customer_id);
end;
$$;
revoke all on function public.pingme_claim_customer_account() from public;
grant execute on function public.pingme_claim_customer_account() to authenticated;

-- 3) Customer may update ONLY name and address. No broad UPDATE policy is added.
create or replace function public.pingme_update_customer_profile(p_name text, p_address text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_old_name text;
  v_old_address text;
begin
  if v_user_id is null then raise exception 'Sign-in required'; end if;
  if length(trim(coalesce(p_name,''))) < 1 or length(trim(p_name)) > 120 then
    raise exception 'Enter a valid name';
  end if;
  if length(coalesce(p_address,'')) > 500 then raise exception 'Address is too long'; end if;

  select id, name, address into v_customer_id, v_old_name, v_old_address
  from public.pingme_customers where auth_user_id = v_user_id for update;
  if v_customer_id is null then raise exception 'Customer account not linked'; end if;

  update public.pingme_customers
  set name = trim(p_name),
      address = nullif(trim(coalesce(p_address,'')), ''),
      updated_at = now()
  where id = v_customer_id;

  insert into public.pingme_customer_profile_audit(customer_row_id, changed_by, changed_fields)
  values (
    v_customer_id,
    v_user_id,
    jsonb_build_object(
      'name', jsonb_build_object('old', v_old_name, 'new', trim(p_name)),
      'address', jsonb_build_object('old', v_old_address, 'new', nullif(trim(coalesce(p_address,'')), ''))
    )
  );
  return jsonb_build_object('updated', true);
end;
$$;
revoke all on function public.pingme_update_customer_profile(text,text) from public;
grant execute on function public.pingme_update_customer_profile(text,text) to authenticated;

-- 4) Customer submits a request; the registered mobile is not changed here.
create or replace function public.pingme_request_mobile_change(p_new_mobile text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_old_mobile text;
begin
  if v_user_id is null then raise exception 'Sign-in required'; end if;
  if length(trim(coalesce(p_new_mobile,''))) < 8 or length(trim(p_new_mobile)) > 20 then
    raise exception 'Enter a valid mobile number';
  end if;
  if p_reason is not null and length(p_reason) > 300 then raise exception 'Reason is too long'; end if;

  select id, mobile into v_customer_id, v_old_mobile
  from public.pingme_customers where auth_user_id = v_user_id for update;
  if v_customer_id is null then raise exception 'Customer account not linked'; end if;
  if regexp_replace(v_old_mobile, '\D', '', 'g') = regexp_replace(trim(p_new_mobile), '\D', '', 'g') then
    raise exception 'New mobile number must be different';
  end if;

  insert into public.pingme_mobile_change_requests(customer_row_id, old_mobile, requested_mobile, reason)
  values(v_customer_id, v_old_mobile, trim(p_new_mobile), nullif(trim(coalesce(p_reason,'')), ''));
  return jsonb_build_object('submitted', true);
end;
$$;
revoke all on function public.pingme_request_mobile_change(text,text) from public;
grant execute on function public.pingme_request_mobile_change(text,text) to authenticated;

-- 5) Admin approves/rejects. Approval requires a non-empty note confirming verification.
create or replace function public.pingme_admin_review_mobile_change(
  p_request_id uuid, p_decision text, p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_req public.pingme_mobile_change_requests%rowtype;
  v_admin_email text := lower(coalesce(auth.jwt() ->> 'email',''));
begin
  if auth.uid() is null or v_admin_email <> 'pingmeconnect@gmail.com' then
    raise exception 'Admin access required';
  end if;
  if p_decision not in ('Approved','Rejected') then raise exception 'Invalid decision'; end if;
  if p_decision = 'Approved' and length(trim(coalesce(p_admin_note,''))) < 5 then
    raise exception 'Add an admin note confirming that the new number was verified';
  end if;

  select * into v_req from public.pingme_mobile_change_requests
  where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_req.status <> 'Pending' then raise exception 'Request has already been reviewed'; end if;

  if p_decision = 'Approved' then
    update public.pingme_customers
    set mobile = v_req.requested_mobile, updated_at = now()
    where id = v_req.customer_row_id;
  end if;

  update public.pingme_mobile_change_requests
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = v_admin_email,
      admin_note = nullif(trim(coalesce(p_admin_note,'')), '')
  where id = p_request_id;

  return jsonb_build_object('reviewed', true, 'status', p_decision);
end;
$$;
revoke all on function public.pingme_admin_review_mobile_change(uuid,text,text) from public;
grant execute on function public.pingme_admin_review_mobile_change(uuid,text,text) to authenticated;

-- 6) Log customer QR downloads/prints. This does not change the QR token.
create or replace function public.pingme_log_qr_action(p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_customer_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  if p_action not in ('download','print') then raise exception 'Invalid QR action'; end if;
  select id into v_customer_id from public.pingme_customers where auth_user_id = auth.uid();
  if v_customer_id is null then raise exception 'Customer account not linked'; end if;
  insert into public.pingme_qr_actions(customer_row_id, action) values(v_customer_id, p_action);
  return jsonb_build_object('logged', true);
end;
$$;
revoke all on function public.pingme_log_qr_action(text) from public;
grant execute on function public.pingme_log_qr_action(text) to authenticated;

-- No customer UPDATE policy is added. Customer IDs, QR tokens, mobile, status,
-- credits, subscription dates, payment fields and ownership remain admin-controlled.
