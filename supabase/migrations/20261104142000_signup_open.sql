-- Whether the one learner account can still be created. Lets the sign-in page
-- hide account creation once it is done. Reveals nothing else.

create or replace function public.signup_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from auth.users);
$$;

revoke all on function public.signup_open() from public;
grant execute on function public.signup_open() to anon, authenticated;
