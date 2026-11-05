# Status

Updated 5 November 2026. Resumed at Arnav's request; work is in progress.

## Where things stand

Phase 0 (set-up) is done apart from the steps waiting on Arnav. Phase 1 (the first slice of 12
lessons) is under way: five lessons written, seven to go.

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
- M1.1 Quantities, units and estimation, and M1.2 Algebra as a language: written, walked,
  reviewed by the independent reviewer and the simulated learner, every finding applied, and
  the changed parts walked again.
- M1.3 Functions: written, walked, and reviewed by both (findings in the session scratchpad,
  summarised in the commit). All findings applied on 5 November: the codomain is chosen at
  set-up and narrowed with the inputs at the square root, an editable mapping diagram in
  Explore, an image model's pixel scaling as the inverse to derive, a second prediction on the
  mirror line with an equal-scale plot, a new build that undoes a chain in reverse order, a
  rounding break-it on pixels, SymPy solving the chain, and reworked rungs. All 37 items pass
  `check:exercises` and the lesson was walked again end to end.
- M1.4 Linear and quadratic functions: written, walked, and reviewed by both (findings in the
  session scratchpad, summarised in the commit). All findings applied on 5 November: a checked
  step proves the mean is best for any three values, chord inputs renamed u and v so a, b and c
  stay the coefficients, titles and the puzzle no longer give answers away, "no real solution"
  ahead of M1.12, negative rates and "loss" explained, ten rung 4s rewritten to locate without
  fixing, tests that guard the starter, and fresh variants. All 48 items pass and the changed
  parts were walked again.
- M1.5 Exponentials and logarithms: written (25 exercises), walked end to end with no errors,
  and pushed (f015327). The independent reviewer and the simulated learner were started on
  5 November; their findings are not yet applied.
- Engine work from these lessons: the mapping diagram's `properties` switch and clearer
  verdicts, fraction and power-of-ten number input, `polynomial` and `completedSquare` answer
  forms, FunctionPlot chords with a rate readout, `equalScale`, and marks drawn whole at the
  edges with labels kept in view, and a "Read as" line that keeps the learner's own brackets.
  From M1.5: one KaTeX version for every package (lesson maths had been wrapping mid-symbol),
  a run of declared one-letter symbols such as nL read as a product, exact whole numbers kept
  whole in answer lines, plot y labels clear of wide ticks, haloed point labels, superscripts
  in figure labels, and log-axis ticks such as 10⁻³.

### Resume here

1. M1.5: apply the independent reviewer's and the simulated learner's findings. If they were
   lost in a pause, run them again: build the views with
   `python3 -I scripts/learner-view.py . M1.5 <scratch dir>` (the key now carries the explain
   rubric and reference), brief the reviewer as for M1.4, then rerun the checks and walk the
   changed parts.
2. Write M1.6 and E1.1 to E1.6 from `docs/phase-1-lessons.md`. Fix these descendant targets on
   the way: M1.6 sigma-notation to M2.3, E1.5 to L2.4 and L6.3, E1.6 unicode-and-bytes to
   M8.6. For each lesson: `npm run check:graph -- --fix`, `check:content`,
   `check:exercises -- --write <code>`, a browser walk-through, then the reviewer and the
   simulated learner.
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
