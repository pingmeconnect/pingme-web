-- PingMe customer account linking + least-privilege self-service
-- Apply in Supabase SQL Editor only after reviewing/backup. This migration does not change existing customer records.
alter table public.pingme_customers
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- A verified email can claim only the matching customer row; it cannot claim another customer's row.
create or replace function public.pingme_claim_customer_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  v_customer_id uuid;
begin
  if v_user_id is null or v_email = '' then
    raise exception 'Verified sign-in required';
  end if;

  select id into v_customer_id
  from public.pingme_customers
  where lower(email) = v_email
    and (auth_user_id is null or auth_user_id = v_user_id)
  limit 1
  for update;

  if v_customer_id is null then
    raise exception 'No unlinked PingMe customer account matches this email';
  end if;

  update public.pingme_customers
  set auth_user_id = v_user_id, updated_at = now()
  where id = v_customer_id;

  return jsonb_build_object('customer_id', v_customer_id);
end;
$$;

revoke all on function public.pingme_claim_customer_account() from public;
grant execute on function public.pingme_claim_customer_account() to authenticated;

alter table public.pingme_customers enable row level security;

drop policy if exists "Customer reads own PingMe account" on public.pingme_customers;
create policy "Customer reads own PingMe account"
on public.pingme_customers for select to authenticated
using (auth_user_id = auth.uid());

-- Intentionally no customer UPDATE policy. Sensitive fields such as credits, status,
-- QR token and subscription dates remain admin-controlled until column-safe profile RPCs are added.
