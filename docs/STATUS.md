# Status

Updated 5 November 2026. Paused at Arnav's request on 5 November; on "Resume", carry on from
"Resume here".

## Where things stand

Phase 0 (set-up) is done apart from the steps waiting on Arnav. Phase 1 (the first slice of 12
lessons) is under way: seven lessons written (M1.1 to M1.6 and E1.1), five to go.

### Done

- Plan approved; decision 1 revised on 4 November 2026: Derive is for Arnav alone.
- Supabase project `spivlvrkjsqxjeonnmvd` (Mumbai) with the schema, row-level security and a
  sign-up guard that admits exactly one allow-listed account.
- Curriculum graph for 332 lessons, 34 courses and 9 capstones, with the graph rules.
- Course update, approved by Arnav and applied on 5 November (plan:
  https://claude.ai/artifact/4ncP8AwPJM1JxBnYK3WFLj): the mathematics, ML and MLE courses
  rebuilt from the source textbooks, with five new courses (M5 Calculus II, M8 Probability II,
  M12 Linear algebra III, L2 Statistical learning, E4 Computer systems), 57 new lessons, seven
  merges, and stage hours of 80, 175, 315, 280 and 465 (about 1,315). Most lesson codes after
  M1 and E1 changed; `docs/course-update.md` maps every old code to its new one. The written
  lessons' links and `docs/phase-1-lessons.md` now use the new codes, and the course artwork
  follows the new course codes, with drawings for the five new courses. The approved plan's
  Plan and Lessons tabs follow the new curriculum.
- App: design tokens, app shell, sign-in, Today, Curriculum, Review, Notebook, Progress,
  Settings and the health route. Vercel project `derive` (bom1) at https://derive-tan.vercel.app.
  CI runs the type check, lint, unit tests, graph and content checks, and the build.
- Redesign, 5 November, at Arnav's request that Derive look and work like a professional
  learning product, close to Codecademy and DataCamp in how it works but entirely Derive's own:
  - Design system: a cool neutral palette with one accent (Derive indigo), a mark colour for
    each curriculum, dark workbench colours for code, Inter, Source Serif and JetBrains Mono, and
    new parts (badges, progress bars and rings, tabs, breadcrumbs, stat strips, course artwork).
    `data-preview="light"` or `"dark"` gives an element that theme's tokens (the theme cards in
    Settings use it).
  - Shell: a sidebar with a "Continue learning" card, and a tab bar on phones.
  - Curriculum at `/curriculum` (the old `/map` redirects there): the stage path, course cards by
    curriculum, capstones and the lesson map. A page per course at `/courses/[code]`, and a
    lesson overview with a phase timeline.
  - The lesson workspace: phases open full screen from `src/app/(workspace)/`, with a phase
    stepper, an outline drawer, the tutor docked on the right (a sheet on phones) and a footer
    with progress and the next step. Code exercises sit in a dark workbench with file tabs, a
    console and test results, and open in a full-screen split editor.
  - Today, Review, Notebook, Progress (an activity calendar and weekly recall against the 85%
    floor), Settings (sections, a live pace preview, theme cards), Placement, sign-in (a split
    page with our own drawing of gradient descent), not-found, error and loading screens.
  - `Store.activity(since)` reads answers in pages for the activity calendar; no schema change.
  - Lesson MDX components and their props are unchanged, so lesson writing carries on as before.
    The one visible change for lessons: a `Stated` link now opens `/lessons/{code}`.
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
- M1.5 Exponentials and logarithms: written, walked, and reviewed by both (findings in the
  session scratchpad, summarised in the commit). All findings applied on 5 November: a fifth
  recall question on when a function can be undone, a paragraph setting doubling against steady
  change, the positive root chosen for fractional powers, the logarithm's domain stated among
  the real numbers, the product rule named and the change of base given for any two bases,
  build reordered so that underflow comes before the log score, tests that guard the starter and
  check that `math.log10` is really used, SymPy's rules tested without `force=True`, rewritten
  rungs, and new later uses (M1.12, L1.6, M9.2, M13.1), with M9.2 now requiring M1.5. All 51
  items pass `check:exercises` and the lesson was walked again end to end.
- Engine work from these lessons: the mapping diagram's `properties` switch and clearer
  verdicts, fraction and power-of-ten number input, `polynomial` and `completedSquare` answer
  forms, FunctionPlot chords with a rate readout, `equalScale`, and marks drawn whole at the
  edges with labels kept in view, and a "Read as" line that keeps the learner's own brackets.
  From M1.5: one KaTeX version for every package (lesson maths had been wrapping mid-symbol),
  a run of declared one-letter symbols such as nL read as a product, exact whole numbers kept
  whole in answer lines, plot y labels clear of wide ticks, haloed point labels, superscripts
  in figure labels, and log-axis ticks such as 10⁻³. From the M1.5 review: a lesson's
  overview shows its concept summaries and link notes only once the lesson is finished, since
  they answered questions the lesson asks, and renders their maths.
- M1.6 Sums, products and series: written, walked, and reviewed by both (findings in the
  session scratchpad, summarised in the commit). All findings applied on 5 November: M1.3 is now
  a required lesson (its tokens and its `def` functions), with a fifth recall question on `def`;
  the partial-sums readouts are exact decimals cut after four places with "…", so a sum is never
  shown rounded up to its limit; the staircase's turn button stays hidden until it opens; the
  sums are said to "close in on" their limit throughout; build tests for n = 0 and for a missing
  `return`, and a message that shows the float's wrong difference at 10¹²; a wrong program for
  the SymPy build; rewritten rungs and misconceptions; and new bridges for M1.5, M1.9 and M14.2.
  All 49 items pass `check:exercises`, and the lesson was walked again end to end after the
  redesign, with its figures checked in both themes and at phone width.
- E1.1 Programs as precise instructions: values, variables and expressions: written on
  5 November, and all 44 items pass `check:exercises`. Walked end to end after the redesign with
  no errors, and its figures screenshotted in both themes at 1,100 and 390 px with nothing
  overflowing; not yet reviewed. Its new engine parts: `FloatLine` (the exact value a float
  holds, with its neighbours, or an exact sum set against its float) and `ExpressionTree` in
  Python notation. The program trace's last step now says "the program has finished".
- Engine and checks from this round: the content check skips fenced code when it looks for
  imports and components, and requires the Connect phase to preview 1 to 3 later lessons; the
  SymPy answer checker treats S, N, O, Q and I as plain letters and reports an answer it cannot
  read instead of failing.

### Resume here

1. E1.1: the independent reviewer and the simulated learner (views from
   `python3 -I scripts/learner-view.py . E1.1 <scratch dir>`), their findings applied, the
   changed parts walked again, and a commit. The walk scripts, the store prep script and a local
   store with M1.1 to M1.6 and E1.1 done (`store-after-E1.1-walk.json`) are in the project files
   folder, `derive-resume/`; copy them into the session scratchpad and run them from there. A
   walk of E1.1 starts from `store-before-E1.1-walk.json`, with M1.6 moved to the day before:
   `python3 -I prep-store.py store-before-E1.1-walk.json .derive-local/store.json M1.6=<day>`,
   then `node walk-e11.cjs overview puzzle recall explore` and `derive build explain`.
2. Write E1.2 to E1.6 from `docs/phase-1-lessons.md`, the same way, keeping the uses that M1.1 and
   E1.1 promise (listed there). Fix these descendant targets on the way: E1.5 not L3.4 or L7.3,
   E1.6 unicode-and-bytes not M11.7. Codes are the new ones from the course update.
3. Tests and CI: Playwright end-to-end tests (no config yet) with axe and screenshots in both
   themes; unit tests for the mixed check, placement and the review queue; add
   `check:exercises` to CI; update the commands table in CLAUDE.md.
4. Tutor leak tests (the Anthropic key is in Vercel; see below), recorded in each lesson's
   leaks.json; then set lessons to `ready`.
5. Finish phase 1: build, push, check the deployment and `/api/health`, and remove the test
   address from `private.allowed_emails` (needs Arnav's approval on the prompt).

### Working notes

- Local walk-through: `DERIVE_LOCAL_STORE=1 DERIVE_SHOW_DRAFTS=1 npx next dev -p 3100`, driven
  with Playwright (Chromium is preinstalled). Learner data is in `.derive-local/store.json`.
  Since the redesign, phase pages keep their addresses but render full screen. "Start {phase}",
  "Finish {phase}" and "Finish the lesson" keep their labels (the finish button is now in the
  footer), and exercise cards keep `data-exercise`. At 1,280 px and wider the outline is an
  `<aside>` as well, so a walk that reads `aside` text should narrow it to the reading.
  A later lesson unlocks only when the earlier one's concepts are mastered or provisional, and
  only one new lesson starts per day, so a walk of M1.2 needs M1.1's concepts set provisional and
  M1.1's start dated the day before. Choices are now visually hidden inputs inside their labels,
  so a walk checks them with `check({ force: true })`.
- Turbopack's development server sometimes keeps an old module after an edit (a page shows the
  previous version, or a new Store method is "not a function"). Restart it when a change does not
  show.
- The pace governor also allows at most three new lessons a week (from Monday), counted from
  each Puzzle's start, so a walk late in a week needs the earlier starts moved back. A recall
  question can be answered only once, so a walk answers each one a single time.
- Without the Anthropic key, written answers cannot be graded; the learner can move on and
  submit later, so concepts stay short of "explained" until the key exists.
- Lesson rule learnt from the M1.1 review: prose after a prediction, a figure caption or the
  names section must sit inside a `<Reveal>` for the exercise it would give away (now in
  CLAUDE.md).
- Lesson codes changed with the course update of 5 November. A note, store or script from
  before then that names a lesson after M1 or E1 uses the old code; `docs/course-update.md`
  gives the new one.

## Waiting on Arnav

Nothing. The three set-up steps asked on 4 November are done or no longer needed. Checked on
5 November: Arnav's account exists and is confirmed (created on 4 November), and `/api/health`
on production reports the tutor key configured. "Confirm email" is still on in Supabase, which
no longer matters now that the one account exists.

## Notes

- This container cannot reach `*.supabase.co` or `*.vercel.app`; the deployed site is checked
  through the Vercel tools.
