# Status

Updated 4 November 2026. Paused at Arnav's request at 21:30 IST; nothing is running.

## Where things stand

Phase 0 (set-up) is done apart from the steps waiting on Arnav. Phase 1 (the first slice of 12
lessons) is under way.

### Done

- Plan approved; decision 1 revised on 4 November 2026: Derive is for Arnav alone.
- Supabase project `spivlvrkjsqxjeonnmvd` (Mumbai) with the schema, row-level security and a
  sign-up guard that admits exactly one allow-listed account.
- Curriculum graph for 282 lessons, 29 courses and 9 capstones, with the graph rules.
- App: design tokens, app shell, sign-in, Today, Map, Review, Notebook, Progress, Settings and
  the health route. Vercel project `derive` (bom1) at https://derive-tan.vercel.app. CI runs
  the type check, lint, unit tests, graph and content checks, and the build.
- Phase 1 engine (commit 1ffbbac): six-phase lessons, in-browser Python and SymPy, five figure
  components, reviews with FSRS, mastery, the pace governor, placement, and the tutor with its
  hint ladder and guard.
- M1.1 Quantities, units and estimation (commit 27a2703): written in full, all exercise checks
  pass, and walked end to end in the browser in local mode (all six phases, the mixed check, a
  review session), with the engine fixes that turned up. Its status is `review`, so production
  does not show it yet.

### Resume here

1. M1.1 quality gate. The independent reviewer and the simulated learner were started and then
   stopped at the pause, so no findings exist yet; run both again.
   - Learner's view: `python3 -I scripts/learner-view.py . M1.1 <scratch dir>` writes the lesson
     as the learner sees it and a separate answer key. The simulated learner reads only the
     view, then marks itself; the reviewer reads the lesson files and the plan's standards.
   - Open point to settle in the review: the plan's Build phase ends by comparing with the
     library version, and M1.1 has none yet (candidate: `datetime.timedelta`).
   - Apply the findings, then run `npm run check:content` and
     `npm run check:exercises -- --write M1.1`.
2. Write M1.2 from the outline in `docs/phase-1-lessons.md`, then M1.3 to M1.6 and E1.1 to
   E1.6. For each: `npm run check:graph -- --fix`, `check:content`,
   `check:exercises -- --write <code>`, a browser walk-through, then the reviewer and the
   simulated learner.
3. Tests and CI: Playwright end-to-end tests (no config yet) with axe and screenshots in both
   themes; unit tests for the mixed check, placement, the review queue and `expr`; add
   `check:exercises` to CI; update the commands table in CLAUDE.md.
4. Tutor leak tests once the Anthropic key is in Vercel, recorded in each lesson's leaks.json;
   then set lessons to `ready`.
5. Finish phase 1: build, push, check the deployment and `/api/health`, and remove the test
   address from `private.allowed_emails` (needs Arnav's approval on the prompt).

### Working notes

- Local walk-through: `DERIVE_LOCAL_STORE=1 DERIVE_SHOW_DRAFTS=1 npx next dev -p 3100`, driven
  with Playwright (Chromium is preinstalled). Learner data is in `.derive-local/store.json`.
- Without the Anthropic key, written answers cannot be graded; the learner can move on and
  submit later, so concepts stay short of "explained" until the key exists.

## Waiting on Arnav

Asked on 4 November 2026, in this order:

1. Switch off "Confirm email" in Supabase (Authentication, Sign In / Providers, Email).
2. Create his account at https://derive-tan.vercel.app/sign-in?mode=create.
3. Create an Anthropic API key in the Default workspace and add it in Vercel as
   `ANTHROPIC_API_KEY` (Production, Sensitive). The next push redeploys with it.

## Notes

- This container cannot reach `*.supabase.co` or `*.vercel.app`; the deployed site is checked
  through the Vercel tools.
