# Status

Updated 4 November 2026.

## Where things stand

Phase 0 (set-up) is done apart from the three steps waiting on Arnav; phase 1 (the first slice of
12 lessons) is under way.

### Done

- Plan approved; decision 1 revised on 4 November 2026: Derive is for Arnav alone.
- Supabase project `spivlvrkjsqxjeonnmvd` (Mumbai) with the initial schema, row-level security
  and the sign-up guard that admits only allow-listed emails.
- Curriculum graph for 282 lessons, 29 courses and 9 capstones, with the graph rules in
  TypeScript (`npm run check:graph`).
- App skeleton: design tokens checked for contrast in both themes, app shell, sign-in and
  account creation, Today, Map, Review, Notebook, Progress and Settings pages, health route.
- CI workflow for type check, lint, unit tests, graph and content checks, and the build.

### Next

1. Done: first commit pushed to `main`; CI is green.
2. Done: Vercel project `derive` (prj_HoUHCyl9wVHLNazctjzrEn6dRy0U) linked to `arnav-raja/Derive`,
   Node 24, region bom1, Standard Protection, with the two public Supabase variables. Production
   is https://derive-tan.vercel.app, and `/api/health` reports Supabase reachable.
3. Done: sign-up admits exactly one account (migrations `single_learner` and `signup_open`); the
   sign-in page stops offering account creation once it exists.
4. When Arnav confirms his account exists: remove the test address from `private.allowed_emails`,
   and check `/api/health` shows `accountExists: true` and, after a push, `tutor.configured: true`.
5. Phase 1: lesson engine, Pyodide worker and tests, SymPy checks, five figure components,
   reviews with FSRS, mastery, pace governor, placement, tutor with hint ladder and guard,
   12 lessons, exercise verification, end-to-end tests and the independent review.

## Waiting on Arnav

Asked on 4 November 2026, in this order:

1. Switch off "Confirm email" in Supabase (Authentication, Sign In / Providers, Email).
2. Create his account at https://derive-tan.vercel.app/sign-in?mode=create.
3. Create an Anthropic API key in the Default workspace and add it in Vercel as
   `ANTHROPIC_API_KEY` (Production, Sensitive). The next push redeploys with it.

## Notes

- The test address in `private.allowed_emails` is removed once sign-up has been tested.
- This container cannot reach `*.supabase.co` or `*.vercel.app`; the deployed site is checked
  through the Vercel tools.
