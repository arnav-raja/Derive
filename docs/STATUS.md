# Status

Updated 6 November 2026, after Arnav's "Resume" of 04:19 UTC. On "Pause" or "Resume", follow
CLAUDE.md and carry on from "Resume here".

## Where things stand

Phase 0 (set-up) is done apart from the steps waiting on Arnav. Phase 1 (the first slice of 12
lessons) is under way: eleven lessons written (M1.1 to M1.6 and E1.1 to E1.5), one to go. E1.6 is
drafted, checked and reviewed by the simulated learner; its independent review was still running
at the last update.

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
  5 November and walked end to end after the redesign with no errors, with its figures
  screenshotted in both themes at 1,100 and 390 px and nothing overflowing. Its new engine
  parts: `FloatLine` (the exact value a float holds, with its neighbours, or an exact sum set
  against its float) and `ExpressionTree` in Python notation.
  The program trace's last step now says "the program has finished". Reviewed by both (findings
  in `derive-resume/review/` in the project files), and every finding applied in commit 28120ba:
  a second swap trace that uses a third name, int and float mixing, e notation and how print
  shows a float, binary and 2^53 put right, the float gap as a share of the number, the
  comparison operators, the one-sided tolerance trap, choices reordered and new variants, a
  typed-in rerun test for the batch program, rewritten rungs and three new misconceptions. The
  float figure now opens typing your own number only after the gap question, and has clear
  messages at the edges of the float range. All 44 items pass `check:exercises`. The changed
  parts were walked on 6 November with no errors, and the figures screenshotted again in both
  themes at 1,100 and 390 px (`store-after-E1.1-walk.json` is that walk). Left as they are on
  purpose: a program that hard-codes
  the typed values still passes build-formulas and build-check-probabilities (testing that needs
  `def`, and M1.3 is not an ancestor of E1.1), and M1.5 and M1.6 still explain int, float and
  `//` themselves, since they do not come after E1.1.
- E1.2 Control flow: conditions and loops: written on 5 November, and all 42 items pass
  `check:exercises`. Walked end to end with no errors, and its figures screenshotted in both
  themes at 1,100 and 390 px with nothing overflowing. The simulated learner worked through all
  of it (24 of 24 right, 12 findings, in `derive-resume/review/E1.2-learner-findings.md`). The
  independent reviewer stopped early at the pause, after its main pass, and wrote 4 blockers, 10
  should-fix findings and nits to `derive-resume/review/E1.2-findings.md`, with what it did not
  reach under "Not yet covered" and its probes in `review/e12rev/`. Its new engine parts: the
  program trace takes `inputs` (the learner types what `input()` reads, or presses a preset, and
  runs it again, with a note while the steps shown are from the old value), predict stops with
  `pass` (stop on the third run of a line), and a "Jump to step" slider hidden until every stop
  in the run is answered; backticked names in a figure's description or prompt are set in the
  code font (in the sans font, `lr` reads as "Ir"); tests can call `rerun(*lines)` to run the
  learner's program again with other typed lines; and `input()` called after every typed line
  is read now says how many lines were typed.
  Both reviews applied on 6 November in commit 70158ea: the four blockers (the trace table, the
  give-away titles and prose, Build's introduction answering the break-it, and 0.001 called
  exact) and every should-fix finding and nit, across all six phases, the exercises, the rungs
  and the tutor notes. Left out on purpose: the reviewer's optional M1.9 foreshadow. All 48 items
  pass `check:exercises`; the lesson was walked again end to end with no errors, and its figures
  and E1.1's screenshotted in both themes at 1,100 and 390 px with nothing overflowing.
  `store-after-E1.2-walk.json` is that walk. Engine changes from the reviews: while a predict
  stop waits, the trace's table lists only the lines run so far, and each row shows what its own
  line changed; at a stop focus moves to the answer box, and after answering back to Next line
  (or to the figure, when stepping with the arrow keys); a stop accepts any way of writing the
  same number (1/8, .125, 1.25e-1) but still tells an int from a float (`trace-answer.ts`); the
  float figure gives differences too small for a float, such as at 5e-324, from the exact
  fraction instead of "about 0"; and code in figure tables is set in the code font.
- Engine and checks from this round: the content check skips fenced code when it looks for
  imports and components, and requires the Connect phase to preview 1 to 3 later lessons; the
  SymPy answer checker treats S, N, O, Q and I as plain letters and reports an answer it cannot
  read instead of failing.
- E1.3 Functions and abstraction: written on 6 November (commit 1a0bd84), walked end to end, and
  reviewed by both (findings in `derive-resume/review/E1.3-*.md`). Every finding applied: the
  text, the exercises, the tests and their messages, the rungs and the tutor notes, with errors
  such as `NameError` explained where they first appear. All 52 items pass `check:exercises`.
  Engine changes from its review: a call that an error stops now reads "`tick` stops with
  `UnboundLocalError`" in the step-through figure (and "the program stops with ..."), not
  "returns `None`"; frame headings keep code in its own case; the status line sets the running
  function's name as code; a stop's value is looked up as Python does, in the running call and
  then the main program; after a return, the table says the caller's change happens "as line 7
  finishes"; and a script stopped by the step limit says so in the workbench.
- E1.4 Data structures and the cost of operations: written on 6 November, walked end to end,
  and reviewed by both (the simulated learner, 27 of 27 right with 15 findings; the independent
  reviewer, 3 blockers, 12 should-fix findings and nits; in `derive-resume/review/E1.4-*.md`).
  Every finding applied: the scale line no longer shows its kept-back value at the end of its
  axis or on its ordinary scale, and the content check now refuses any scale line that would;
  headings, titles and the summary no longer answer the alias, mutating-call and plain-lookup
  questions; build-unique-fast counts hashing as work, so a version that builds a set for every
  document fails, and its first wrong program no longer depends on Python's string hashing; a
  vocabulary test that a set's order cannot pass by luck; maxOps 4 for the ratio; placement
  asks about a dict; omitted slice ends, lists inside lists and "object" explained; reveals that
  repeated their cards trimmed; list growth stated as CPython does it (about an eighth, and up
  to about nine copies per append if every resize moved the list); the doubling proof's last
  steps given a rule each; a bridge to `history=None`; rewritten rungs and four new
  misconceptions; and M1.2's exponent rules linked. The million-document claim can be tried in
  the editor (build-unique-fast's step budget is 10 million). All 54 items pass, and the changed
  figures were screenshotted again in both themes at 1,100 and 390 px with nothing overflowing;
  `store-after-E1.4-walk.json` is that walk. Engine: the step-through figure tags each list,
  dict and set ("`b` refers to list 1 (`[1, 2]`)", "list 1, which `a` and `b` refer to, is now
  `[1, 2, 3]`") and compares a fingerprint of each tagged value, so a change past the 80th
  character still shows; the form check counts operations on the answer as typed; and a
  RecursionError is reported at the call that went one too deep, not at the `def` line.
- E1.5 Recursion: written on 6 November, walked end to end, and reviewed by both (the simulated
  learner, 24 of 24 right with 15 findings; the independent reviewer, 3 blockers, 8 should-fix
  findings and nits; in `derive-resume/review/E1.5-*.md`). Every finding applied: the memo
  build's call-counting test now finds a function made by `functools.cache`, and a new test of
  the rule itself fails a typed-in table; a new test fails a script that raises Python's limit on
  calls in progress; a recall question renamed, since its name gave its answer; claims put right
  (a call carries on from where it stopped, nested data is followed as deep as Python has room
  for calls, a memo is safe only for a function that does nothing else, the proof's claim covers
  the lists whose calls fit, and three checks, not two, trust a recursive function); the puzzle
  no longer rules out one option; the scale line no longer shows two points either side of its
  kept-back value; times given as measured (in Chromium here, `fib(25)` takes 0.13 s, about 1.8
  million calls a second, so the lesson says one to two million, and the figure and the estimate
  work at a million); review variants that repeated their item replaced, so placement's
  questions cannot be answered from their wording; rewritten rungs and two new misconceptions.
  All 42 items pass `check:exercises`, and the lesson was walked again end to end with no errors
  (`store-after-E1.5-rewalk.json`). Engine changes from its review: Python's limit on calls in
  progress is capped at 2,000 and put back after every run, test and trace (in Chromium's worker
  an endless recursion survives a limit of 3,000 but not 4,000, and a raised limit had carried
  into later runs); a worker that Pyodide reports as fatally failed is replaced for the next
  request; the step-through figure names each call by its arguments ("Call `countdown(2)`", "about
  to run line 7 in `countdown(1)`") and its table says what each line prints; and the scale
  line's guess starts at the left end, with "Move the slider to set your guess" beside the
  waiting Lock button.
- Placement: the check's "at most n to go" counted only the lessons it could ask about yet, so the
  number grew as lessons passed (3 to go, then 7). It now counts every question still reachable
  if every answer is right. Found by the new placement unit tests.
- Curriculum changes from these reviews: E1.5 requires E1.3 and E1.4, and M1.9 (induction) and
  L7.3 (dynamic programming) now build on E1.5, where the plan had E1.5 build on M1.9; E1.7
  Classes and objects now requires E1.4 as well as E1.3, since objects need aliasing; E1.4's concepts gained later uses in E1.11, E8.4 and E6.2;
  and "the Derive phase" replaces a bare "Derive" in E1.1 to E1.4 wherever it could be read as
  the school.

### Resume here

The walk scripts, the store prep script, the local stores and the review findings are in the
project files folder, `derive-resume/`; copy them into the session scratchpad and run them from
there. If a review below is missing from `derive-resume/review/`, run that reviewer again (the
learner views come from `python3 -I scripts/learner-view.py . <code> <scratch dir>`; keep the
answer key in a separate folder). The briefs given to the reviewer and the simulated learner are
in `derive-resume/review/prompts/`; change the lesson and the paths in them for another lesson.

1. Finish E1.6 Text, files and strings. Its draft is in `derive-resume/e16-draft/` (all six
   phases, 25 exercises, the rungs; 44 items pass `check:exercises` in a scratch copy). The
   simulated learner's findings are in `derive-resume/review/E1.6-learner-findings.md`; if
   `E1.6-findings.md` is missing there, run the independent reviewer again from its brief in
   `derive-resume/review/prompts/`. Copy the draft to `content/lessons/E1.6/`, run
   `npm run check:graph -- --fix`, `check:content` and `check:exercises -- E1.6 --write`, apply
   both reviews, walk it end to end with `walk-e16.cjs` and `e16figs.cjs` (its store: run
   `prep-store.py` on `store-after-E1.5-rewalk.json` with E1.4 and E1.5 moved to the two days
   before, then `provisional.py` for E1.5), and commit. The learner's finding 14 asks the
   harness to give the line of an error raised inside a test, as it does for the program.
2. Tests and CI: unit tests for the mixed check, the review queue and placement are written.
   Still to do: Playwright end-to-end tests (no config yet) with axe and screenshots in both
   themes; add `check:exercises` to CI; update the commands table in CLAUDE.md.
3. Tutor leak tests (the Anthropic key is in Vercel; see below), recorded in each lesson's
   leaks.json; then set lessons to `ready`.
4. Finish phase 1: build, push, check the deployment and `/api/health`, and remove the test
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
