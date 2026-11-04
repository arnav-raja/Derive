# Status

Updated 4 November 2026.

## Where things stand

Phase 0 (set-up) is being finished; phase 1 (the first slice of 12 lessons) follows at once.

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

1. Done: first commit pushed to `main`.
2. Vercel project `derive` (prj_HoUHCyl9wVHLNazctjzrEn6dRy0U) linked to `arnav-raja/derive`,
   Node 24, region bom1, Standard Protection, with the two public Supabase variables. Next:
   check the first production deployment and `/api/health`.
3. Check whether Supabase requires email confirmation; if so, ask Arnav to switch it off.
4. Ask Arnav for the Anthropic API key, pasted straight into Vercel.
5. Phase 1: lesson engine, Pyodide worker and tests, SymPy checks, five figure components,
   reviews with FSRS, mastery, pace governor, placement, tutor with hint ladder and guard,
   12 lessons, exercise verification, end-to-end tests and the independent review.

## Waiting on Arnav

- Nothing yet.

## Notes

- The test address in `private.allowed_emails` is removed once sign-up has been tested.
- This container cannot reach `*.supabase.co` or `*.vercel.app`; the deployed site is checked
  through the Vercel tools.
