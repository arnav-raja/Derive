# Status

Updated 5 November 2026. Resumed at Arnav's request; work is in progress.

## Where things stand

Phase 0 (set-up) is done apart from the steps waiting on Arnav. Phase 1 (the first slice of 12
lessons) is under way: two lessons written, ten to go.

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
- M1.1 Quantities, units and estimation: written, reviewed by the independent reviewer and the
  simulated learner (5 November), and every finding applied: Explore and Derive reordered so no
  answer shows before it is asked for, an 11-line cancel chain, units carried through the
  in-head check, a SymPy library comparison in Build, and corrected hints and tutor notes. All
  checks pass and the changed phases were walked again in the browser.
- M1.2 Algebra as a language: written in full (22 exercises), all checks pass, and walked end
  to end in the browser.
- Engine fixes from these walks: tree text keeps every bracket, numeric leaves show their value
  once, tree tables hide values until shown, the ordinary scale waits for its prediction
  (`linearAfter`), worked steps never break across lines, the break-it view marks only the
  changed lines, digits are grouped in threes everywhere, and the content check warns when right
  answers cluster in the first option.

### Resume here

1. M1.2 quality gate: run the independent reviewer and the simulated learner
   (`python3 -I scripts/learner-view.py . M1.2 <scratch dir>` writes the learner's view and a
   separate answer key; the view now shows options by letter and hides figure answers). Apply
   the findings, then `check:content` and `check:exercises -- --write M1.2`.
2. Write M1.3 to M1.6 and E1.1 to E1.6 from `docs/phase-1-lessons.md`. Fix these descendant
   targets on the way: M1.5 log-rules to M7.2, M1.5 log-scales to E2.6, M1.6 sigma-notation to
   M2.3, E1.5 to L2.4 and L6.3, E1.6 unicode-and-bytes to M8.6. For each lesson:
   `npm run check:graph -- --fix`, `check:content`, `check:exercises -- --write <code>`, a
   browser walk-through, then the reviewer and the simulated learner.
3. Tests and CI: Playwright end-to-end tests (no config yet) with axe and screenshots in both
   themes; unit tests for the mixed check, placement and the review queue; add
   `check:exercises` to CI; update the commands table in CLAUDE.md.
4. Tutor leak tests once the Anthropic key is in Vercel, recorded in each lesson's leaks.json;
   then set lessons to `ready`.
5. Finish phase 1: build, push, check the deployment and `/api/health`, and remove the test
   address from `private.allowed_emails` (needs Arnav's approval on the prompt).

### Working notes

- Local walk-through: `DERIVE_LOCAL_STORE=1 DERIVE_SHOW_DRAFTS=1 npx next dev -p 3100`, driven
  with Playwright (Chromium is preinstalled). Learner data is in `.derive-local/store.json`.
  A later lesson unlocks only when the earlier one's concepts are mastered or provisional, and
  only one new lesson starts per day, so a walk of M1.2 needs M1.1's concepts set provisional and
  M1.1's start dated the day before.
- Without the Anthropic key, written answers cannot be graded; the learner can move on and
  submit later, so concepts stay short of "explained" until the key exists.
- Lesson rule learnt from the M1.1 review: prose after a prediction, a figure caption or the
  names section must sit inside a `<Reveal>` for the exercise it would give away (now in
  CLAUDE.md).

## Waiting on Arnav

Asked on 4 November 2026, in this order:

1. Switch off "Confirm email" in Supabase (Authentication, Sign In / Providers, Email).
2. Create his account at https://derive-tan.vercel.app/sign-in?mode=create.
3. Create an Anthropic API key in the Default workspace and add it in Vercel as
   `ANTHROPIC_API_KEY` (Production, Sensitive). The next push redeploys with it.

## Notes

- This container cannot reach `*.supabase.co` or `*.vercel.app`; the deployed site is checked
  through the Vercel tools.
