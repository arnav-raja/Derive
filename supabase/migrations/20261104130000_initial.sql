-- Derive: initial schema.
-- The curriculum (courses, lessons, concepts, links) lives in Git and is compiled
-- into the app. The database holds only the learner's own state and history.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Who may create an account. Derive serves one learner now and opens later,
-- so sign-ups are limited to this list. Rows are added by the operator, not by
-- migrations, so no address is committed to the repository.
create table private.allowed_emails (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);

create or replace function private.guard_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.allowed_emails a where a.email = lower(new.email)
  ) then
    raise exception 'Derive is not open for new accounts yet' using errcode = 'P0001';
  end if;
  -- Allow-listed addresses are trusted, so they need no confirmation email.
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

create trigger guard_signup
  before insert on auth.users
  for each row execute function private.guard_signup();

-- Learners ------------------------------------------------------------------

create table public.learners (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  weekly_hours numeric(4, 1) not null default 10 check (weekly_hours between 1 and 60),
  daily_tutor_budget_usd numeric(8, 2) not null default 2 check (daily_tutor_budget_usd >= 0),
  monthly_compute_budget_usd numeric(8, 2) not null default 15 check (monthly_compute_budget_usd >= 0),
  settings jsonb not null default '{}'::jsonb,
  placement jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.create_learner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.learners (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger create_learner
  after insert on auth.users
  for each row execute function private.create_learner();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger learners_touch
  before update on public.learners
  for each row execute function private.touch_updated_at();

-- Lesson progress: one row per lesson phase ---------------------------------

create table public.lesson_progress (
  learner_id uuid not null references public.learners (id) on delete cascade,
  lesson_code text not null,
  phase text not null check (phase in ('puzzle', 'recall', 'explore', 'derive', 'build', 'explain')),
  status text not null default 'started' check (status in ('started', 'completed')),
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_id, lesson_code, phase)
);

create trigger lesson_progress_touch
  before update on public.lesson_progress
  for each row execute function private.touch_updated_at();

-- Mastery evidence for each concept ------------------------------------------

create table public.concept_state (
  learner_id uuid not null references public.learners (id) on delete cascade,
  concept_id text not null,
  produced_at timestamptz,
  explained_at timestamptz,
  recalled_at timestamptz,
  mastered_at timestamptz,
  provisional boolean not null default false,
  evidence jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (learner_id, concept_id)
);

create trigger concept_state_touch
  before update on public.concept_state
  for each row execute function private.touch_updated_at();

-- FSRS state for each practice item -------------------------------------------

create table public.review_cards (
  learner_id uuid not null references public.learners (id) on delete cascade,
  card_id text not null,
  lesson_code text not null,
  concept_id text not null,
  due timestamptz not null,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0,
  last_review timestamptz,
  next_variant integer not null default 0,
  provisional boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (learner_id, card_id)
);

create index review_cards_due on public.review_cards (learner_id, due);

-- Every answer, code run, review and hint ---------------------------------------

create table public.attempts (
  id bigint generated always as identity primary key,
  learner_id uuid not null references public.learners (id) on delete cascade,
  lesson_code text,
  exercise_id text,
  card_id text,
  kind text not null check (kind in (
    'predict', 'recall', 'step', 'proof', 'build', 'breakit', 'estimate',
    'debug', 'visualise', 'explain', 'review', 'placement', 'check', 'run'
  )),
  correct boolean,
  confidence smallint check (confidence between 0 and 100),
  hints_used smallint not null default 0,
  rating smallint check (rating between 1 and 4),
  payload jsonb not null default '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index attempts_recent on public.attempts (learner_id, created_at desc);
create index attempts_item on public.attempts (learner_id, lesson_code, exercise_id);

-- Explain-backs and their rubric scores ---------------------------------------

create table public.explanations (
  id bigint generated always as identity primary key,
  learner_id uuid not null references public.learners (id) on delete cascade,
  lesson_code text not null,
  item_id text not null,
  body text not null,
  rubric jsonb not null default '{}'::jsonb,
  passed boolean,
  feedback text,
  created_at timestamptz not null default now()
);

create index explanations_item on public.explanations (learner_id, lesson_code, item_id);

-- Gaps and open questions, the learner's and the tutor's ------------------------

create table public.notebook_entries (
  id bigint generated always as identity primary key,
  learner_id uuid not null references public.learners (id) on delete cascade,
  kind text not null check (kind in ('gap', 'question', 'misconception', 'explanation', 'confused')),
  source text not null check (source in ('learner', 'tutor', 'system')),
  lesson_code text,
  location text,
  body text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  revisit_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index notebook_open on public.notebook_entries (learner_id, status, created_at desc);

-- Tutor conversations: summaries and token spend --------------------------------

create table public.tutor_sessions (
  id bigint generated always as identity primary key,
  learner_id uuid not null references public.learners (id) on delete cascade,
  lesson_code text,
  exercise_id text,
  mode text not null check (mode in ('hint', 'novice', 'grade', 'socratic', 'examiner', 'notebook')),
  rung smallint check (rung between 1 and 5),
  summary text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  guard_blocked smallint not null default 0,
  created_at timestamptz not null default now()
);

create index tutor_sessions_recent on public.tutor_sessions (learner_id, created_at desc);

-- CPU and GPU runs, with estimated and actual cost ------------------------------

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete cascade,
  lesson_code text,
  kind text not null check (kind in ('cpu', 'gpu')),
  hardware text,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  estimated_cost_usd numeric(10, 4),
  actual_cost_usd numeric(10, 4),
  cap_usd numeric(10, 4),
  logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index jobs_recent on public.jobs (learner_id, created_at desc);

-- Row-level security: every learner sees and changes only their own rows ---------

alter table public.learners enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.concept_state enable row level security;
alter table public.review_cards enable row level security;
alter table public.attempts enable row level security;
alter table public.explanations enable row level security;
alter table public.notebook_entries enable row level security;
alter table public.tutor_sessions enable row level security;
alter table public.jobs enable row level security;

create policy "learners read own row" on public.learners
  for select to authenticated using (id = (select auth.uid()));
create policy "learners update own row" on public.learners
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'lesson_progress', 'concept_state', 'review_cards', 'attempts',
    'explanations', 'notebook_entries', 'tutor_sessions', 'jobs'
  ] loop
    execute format(
      'create policy "own rows: select" on public.%I for select to authenticated using (learner_id = (select auth.uid()))', t);
    execute format(
      'create policy "own rows: insert" on public.%I for insert to authenticated with check (learner_id = (select auth.uid()))', t);
    execute format(
      'create policy "own rows: update" on public.%I for update to authenticated using (learner_id = (select auth.uid())) with check (learner_id = (select auth.uid()))', t);
    execute format(
      'create policy "own rows: delete" on public.%I for delete to authenticated using (learner_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Explicit grants (anon gets nothing).
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
