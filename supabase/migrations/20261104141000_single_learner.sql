-- Derive has exactly one learner. Once an account exists, sign-up is closed
-- for good, whatever address is used.

create or replace function private.guard_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Derive already has its learner' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from private.allowed_emails a where a.email = lower(new.email)
  ) then
    raise exception 'Derive is not open for new accounts' using errcode = 'P0001';
  end if;
  -- The one allow-listed address is trusted, so it needs no confirmation email.
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;
