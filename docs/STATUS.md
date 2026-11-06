# Status

Updated 6 November 2026 at about 23:10 UTC, when E1.9 went live. On "Pause" or "Resume",
follow CLAUDE.md and carry on from "Resume here" (phase 1) and "Phase 2: resume here" (phase 2).

## Where things stand

Phase 0 (set-up) is done apart from the steps waiting on Arnav. Phase 1 (the first slice of 12
lessons) is done: all 12 lessons are written (M1.1 to M1.6 and E1.1 to E1.6) and live, with
the tutor working in each, and the end-to-end tests and performance budgets pass and run in CI.
On 6 November Arnav declined the tutor leak tests (no sign-in exemption and no API credit for
them), and said he must be able to study a phase as soon as it is complete and that there must
be an AI chat widget; so the 12 lessons went live without the tests, with the Tutor panel in
every lesson, and CLAUDE.md now has the rule that a lesson goes live once written, checked,
reviewed and walked. Phase 1's gate, Arnav finishing three lessons end to end, is his to pass.
Hosting moved off Vercel on 6 November, at Arnav's word ("Use GitHub. Use GitHub Actions. Use
GitHub Pages. Don't use Vercel."), in its own thread ("Move Derive hosting to GitHub Pages"):
GitHub Actions builds the site for GitHub Pages at https://arnav-raja.github.io/Derive/ and
deploys Derive's server, tutor included, to the Supabase Edge Function `derive-api` (see
"Hosting" below and the Stack section of CLAUDE.md). The Vercel project stays up until the new
site works end to end, and is removed only when Arnav says so.

Phase 2 (the full learning loop, and the lessons after the first slice) began on 6 November in
its own thread. M1.7 Logic, sets and quantifiers is live (`ready`): written, reviewed by both
reviewers, every finding applied, walked again and tested end to end, with two new figure
components, the set diagram and the quantifier grid. E1.7 Classes and objects is live too,
reviewed by both, every finding applied, walked and tested end to end. M1.8 Proof I is live
too, on the same terms, and so are E1.8 Debugging as an experiment, M1.9 Proof II:
induction and recursion, and E1.9 Testing and property-based testing. M1.10 Counting:
permutations, combinations and the binomial theorem is next.

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
  Settings and the health route. CI runs the type check, lint, unit tests, graph and content
  checks, and the build.
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
- E1.6 Text, files and strings: written on 6 November, walked end to end, and reviewed by both
  (the simulated learner, 22 of 24 right with 15 findings; the independent reviewer, 2 blockers,
  11 should-fix findings and nits; in `derive-resume/review/E1.6-*.md`). Every finding applied:
  the text around the bytes figure no longer answers its café prediction; the proof now proves
  that every character of the Devanagari block (2,304 to 2,431) takes three bytes, from rules
  that hold, and the text names the rare signs kept in other blocks; string order
  explained (capitals before small letters, a string before any longer one that starts with it);
  the bits of é worked through, hexadecimal and printed bytes explained; `for line in f`, the last
  line without a newline, and empty fields from `split` covered; a new figure caption for the log
  trace; reordered options and variants; new tests for large steps and for naming the encoding,
  two new wrong programs for each of read_log and truncate, and a test that truncate does not
  use `errors=`; rewritten rungs, two new misconceptions, and a foreshadow of E1.11. All 44 items
  pass `check:exercises`, and the lesson was walked again end to end with no errors
  (`store-after-E1.6-walk.json`). Engine changes from its review: the bytes figure has one "Show
  the bits" toggle, marks its Hindi text as Hindi for screen readers, and labels its bits column
  "UTF-8 bytes, marker bits first"; and an error raised inside a test now names the learner's
  line and function, as the console does for the program ("IndexError on line 4, in truncate:
  index out of range").
- Phase 1's end-to-end tests (`e2e/`, `npm run test:e2e`): the production build in local mode,
  with two test learners on their own stores, one just signed up and one who has finished every
  written lesson (so every Reveal is open). Every app page for both, the sign-in pages and the
  not-found page, and every phase of every written lesson, are opened at phone, tablet and
  desktop widths and looked at in both themes: a full-page screenshot of each, a screenshot of
  each figure, checks for the failures the plan names (anything wider than the window, content
  cut off, the browser's default font or background, a font that failed, layout shift while
  loading above 0.1, figures without a title, a description or room), axe's WCAG 2.2 A and AA
  rules, and no errors logged. Screenshot tests check these properties and keep the screenshots
  with the report; they are not compared with saved pictures, since the pages change with every
  lesson and rendering differs between machines. What they found, and what changed: options
  whose label is all maths had no accessible name, so each option with maths is now named by its
  label as plain text (with a unit test over every lesson); a box that scrolls sideways is made
  a tab stop while it does not fit, so the keyboard can scroll it (`ScrollStops`), and boxes of
  maths no longer scroll up and down by a pixel or two; lesson tables scroll in their own box on
  a phone; the theme previews in Settings fit at phone width; and the Definition label has
  enough contrast. Text also jumped as the fonts arrived on a slow phone (a layout shift of
  0.142), so the Latin faces of Inter and Source Serif are now served by the app and preloaded
  (`src/app/fonts/`), the serif only on the pages that use it; with the processor slowed six
  times the shift is now at most 0.004. The performance budgets (`e2e/performance.spec.ts`) hold
  each app page and every lesson phase to its bytes of script, style, fonts and HTML and to its
  number of elements; they were set on 6 November, about 15 per cent above what each page
  measured, and a page over its budget fails the build. Times are not budgeted, since they
  differ from machine to machine. CI runs `check:exercises` and the end-to-end tests, and keeps
  the report with its screenshots for 14 days; its first run, on 6 November, passed all 373 in
  13 minutes. If the end-to-end job fails in CI but not here, its report names the page. A
  budget is raised only on purpose, with the reason in the commit.
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

1. Remove the test address (the row that is not Arnav's) from `private.allowed_emails`.
   Arnav said yes on 6 November; the Supabase tool asks him to confirm the delete, and its first
   prompt timed out, so send it again when he says he is ready.
2. Tutor leak tests are not run: Arnav declined them on 6 November. If he ever asks for them,
   `derive-resume/leaks/` has the proxy fix (`proxy-patch.py`, `proxy.test.ts`), the merge
   script and the steps; `content/lessons/<code>/leaks.json` takes the records, and the content
   check warns about missing ones and fails only a ready lesson whose record failed.

### Phase 2: resume here

Phase 2 of the plan, word for word: "Platform work: Map, Notebook and concept map, explain-back
and viva modes, the "This confused me" button, automatic revision flags, and the remaining
figure components. Lessons ready: all of stage 1 and the start of stage 2. Gate to move on:
stage 1 done at a steady pace, with recall at 85% or better." Lessons stay 4 to 6 weeks ahead
of Arnav. Each lesson goes live (`ready`) once it is written, checked, reviewed and walked
(CLAUDE.md), so that Arnav can study a phase as soon as it is complete.

Done so far:

- M1.7 Logic, sets and quantifiers, live (`ready`) since 6 November: all six phases, 24
  exercises (a puzzle on which cards test "if spam, then a link", 5 recall, 7 explore
  predictions, 3 derivation steps and 2 proofs of rules, 3 builds and 2 break-its, and the
  explain-back), tutor notes with 12 misconceptions, and checks.json. It requires M1.2 and M1.3,
  and its sets now lead to M1.10 as well. Reviewed by both (the simulated learner, 23 of 24 right
  at the first answer with 25 findings; the independent reviewer, 2 blockers, 21 should-fix
  findings and nits; in `derive-resume/review/M1.7-*.md`), and every finding applied: a lab's
  rule ("if a job runs for more than a day, then it must be approved") replaces the item that
  repeated the puzzle's card, and its placement question asks the harder case; the filters say
  "and drop every other email" instead of "if"; subsets are practised (a new review variant, and
  the claim's figure asks for the set the claim allows, $P^c \cup Q$); the explain-back asks
  which set must be empty; a truth table is said to settle a rule, with the chain of rules as a
  second proof; the Build phase says what Python's `and` and `or` do to sets and to SymPy's
  symbols, that `satisfiable` is a small SAT solver and does not try every row, and gives a
  nested example before the quantifier build; new tests catch `distinct` that lists ids, and a
  `short_filter` built with Python's own `and`; and rewritten rungs, notes and reveals.
  `check:exercises` passes all its 44 items, and the lesson was walked again in all six phases
  (store `derive-resume/store-after-M1.7-rewalk.json`), with its figures in both themes at 1,100
  and 390 px: no horizontal overflow and no page errors. Its end-to-end tests pass at all three
  widths.
- Two figure components, with unit tests: `SetDiagram` (two sets in a rectangle; four regions
  shaded from the picture or a list; it asks for sets written with ∪, ∩ and ᶜ in turn, names
  the regions shaded rightly before what is wrong, says when nothing is shaded, and says "It is
  the same set as" when two sets match, De Morgan's laws) and `QuantifierGrid` (a grid of ticks
  with four statements; `verdictsAfter="<exercise>"` keeps the verdicts, the evidence cells and
  editing closed until that exercise is done; a screen reader hears which statements a change
  made true or false, from one status line).
- E1.7 Classes and objects, live (`ready`) since 6 November: all six phases and 23 exercises (a
  puzzle on two configs with equal settings that `==` calls unequal, 5 recall, 7 explore
  predictions, a proof of rules, 2 derivation steps and an estimate, 3 builds, a debug and a
  break-it, and the explain-back), tutor notes with 19 misconceptions, and checks.json. It
  requires E1.3 and E1.4, and its special methods lead to M6.5, L3.4, E5.1, E5.5 and E1.10.
  Reviewed by both (the simulated learner, 23 of 23 right with 14 findings; the independent
  reviewer, 2 blockers, 8 should-fix findings and 9 nits; in `derive-resume/review/E1.7-*.md`),
  and every finding applied: the puzzle's story no longer says that every config was trained
  twice before the question (its reveal does); titles and set-up text no longer answer their
  items; the first figure's stop asks for `a.lr` in the second call, which tests that `self` is
  the new object; prose that a stop checks moved into the next Reveal; a class with no
  `__init__`, `str(a)`, and an `__init__` that must return `None` are explained; the names
  section says an attribute is missing only when neither the object nor its class has it; the
  proof names lines by their text; the tests now accept a copy of the parents passed in, and
  catch parents kept as a tuple, parents in the wrong order (with a message of their own), a
  first loss of 1e300 and a `__repr__` that calls itself; and rewritten rungs, notes and three
  new misconceptions. E1.10 now requires E1.7, as E1.7's build promises that E1.10 shows how to
  give a class a `__hash__`; the promise is not repeated as a preview in E1.7's last phase,
  which already has the three it may hold. Explore is 55 minutes, over the plan's 30 to 45 as
  E1.6's was, since it has seven items and three figures. `check:exercises` passes all 669 items
  in the 15 lessons, and the lesson was walked in all six phases with no errors
  (`derive-resume/e17walk/`, from `store-before-E1.7-walk.json` with M1.7 started a day earlier
  by `prep-store.py`; the store after it is `store-after-E1.7-walk.json`).
- Engine changes: Pyodide starts with a fixed hash seed (`PYTHONHASHSEED=0`) in the browser's
  worker and in Node, so sets of strings and SymPy's searches come out the same on every run
  and the runs kept in checks.json stay true (without it `check:exercises` failed about half
  the time on M1.7); the end-to-end tests scroll the page back after the figure screenshots, as
  a figure left under the sticky header had its buttons counted as too small to touch; an
  option's plain-text name now writes `\varnothing`, `\Leftrightarrow`, `\setminus` and
  `\supseteq` as signs; and the review and notebook answer lines drop a label's full stop
  before joining labels with semicolons.
- Engine changes with E1.7: the step-through figure shows each object's attributes (the harness
  records them, and the frames look a name up through the object) and skips the frames of class
  bodies. A call of a special method (`__call__`, `__repr__`, `__eq__`, `__add__` and the rest)
  more than 200 deep stops with Python's own `RecursionError`, since Pyodide's stack in Chromium
  overflows at 300 to 400 nested calls of `__call__` and 500 to 600 of the others (Firefox and
  Safari are untested). The figure's code now keeps the width of its longest line, and the
  variables move below the code when there is no room for them beside it, so a code line is cut
  only on a phone; before, lines were cut at 1,280 px in E1.1, E1.6 and E1.7, and at every width
  in E1.6. A figure's stop can now ask for an attribute that an object finds in its class, or a
  class's own, such as `self.losses` or `Run.losses`, since the harness records the attributes
  that reading finds, not only an object's own.
- M1.8 Proof I: direct proof, contrapositive and contradiction, live (`ready`) since 6
  November: all six phases and 25 exercises (a puzzle on Euler's n² + n + 41, 5 recall, 7
  explore predictions, 2 derivation steps, 4 proofs, 2 of them rules to cite and 2 written, 3
  builds and 2 break-its, and the explain-back), tutor notes with 14 misconceptions, and
  checks.json. It requires M1.7 and leads to M1.9. Reviewed by both (the simulated learner, 24 of
  24 right with 21 findings; the independent reviewer, 1 blocker, 17 should-fix findings and 16
  nits; in `derive-resume/review/M1.8-*.md`), and every finding applied apart from three
  optional nits (below): the explain-back's prompt now asks everything its rubric checks; no
  prose before a question names the method it asks about, and the names of direct proof, proof
  by cases, the contrapositive and contradiction come after their questions; a new written proof,
  odd times odd, gives the learner a direct proof of their own; the proof of the contrapositive
  has a line for "Suppose that n is odd", with a rule of its own; the small-factor proof is
  written in full, with a generic rubric; Euclid's item asks what the argument says about
  30,031, and Euclid's own direct form follows it; the Explore phase proves that no prime below 41
  divides any value of the formula (197 remainders); the prime test's tests catch a range that
  stops one short with squares such as 49, and no longer give away the break-it on 1,681, nor
  depend on a margin of steps; and rewritten options (no right option is longer than every other
  by 15% or more, and four right answers moved first), rungs and notes. The lesson summary is now
  plain text, since the overview and Today show it without maths, and `check:content` now
  rejects TeX in a lesson's title or summary. `check:exercises` passes all its 45 items, the
  lesson was walked in all six phases with no page errors (store from
  `store-after-E1.7-walk.json`, with M1.7 and E1.7 a day earlier and their concepts provisional),
  and its end-to-end tests pass at all three widths. Optional nits not done: a figure of factor
  pairs, an optional `factorint` item, and a superscript for k² in the checker's "Read as" line.
- E1.8 Debugging as an experiment, live (`ready`) since 6 November: all six phases and 22
  exercises (a puzzle on how few hour-long checks always find which of 1,000 changes broke a
  training script, 5 recall, 7 explore predictions, 2 derivation steps, a proof of rules and a
  prediction, a debug, 2 builds and a break-it, and the explain-back), two step-through figures,
  tutor notes with 28 misconceptions, and checks.json. It requires E1.3, contrasts with M1.8,
  applies M1.1 and foreshadows E1.9, E3.2 and E10.3. Reviewed by both (the simulated learner, 22
  of 22 right with 16 findings; the independent reviewer, 1 blocker, 11 should-fix findings and
  nits; in `derive-resume/review/E1.8-*.md`), and every finding applied: the sentence under the
  second figure that answered its stop moved into the break-it's reveal; the first figure's stop
  asks for `k`, which is not yet on screen and is the value that tells the two hypotheses apart;
  the Derive phase's gap item now asks for a search that checks a third of the way, whose worst
  case is $N(2/3)^k$, and its reveal says why midway is best (34 checks for a million versions
  against 20); set-up lines that narrowed two items are gone, and "Not fooling yourself" is now
  "Three changes in one afternoon"; Python that the ancestors do not teach is gone (a loop over
  a tuple, a number's truth value, f-strings in the reference); the debug item's starter has two
  comment lines for the hypothesis and its prediction; the mean's form check counts operations as
  typed (`maxOps: 3`), so an uncancelled fraction gets the form message however it is written;
  build-assert's factor test no longer hangs on a factor of 1, and a single assert for both
  parameters, a message in capitals and a learner's own assert in a good call each get a message
  that fits; build-first-bad says "gives None" instead of "a NoneType", and names a search that
  never asks the tests' `is_bad`; the explain-back asks whether an error's line is always the one
  to change; and rewritten reveals, rungs and notes, with three new misconceptions.
  `check:exercises` passes all its 38 items (708 in the 16 lessons), the lesson was walked again
  in all six phases with no page errors (store `derive-resume/e18walk/store-before-E1.8-walk.json`,
  from `store-after-M1.8-walk.json` with M1.7, E1.7 and M1.8 started in the week before by
  `prep-store.py`, as the week's three new lessons had been used; the store after it is
  `store-after-E1.8-walk.json`), and its end-to-end tests pass at all three widths.
- Engine changes with E1.8: an error with no message, as a bare `assert` raises, is shown as
  "AssertionError on line 5" with no ": " after it, in the code card, the step-through figure and
  the tutor's context ("with no message"); an AssertionError raised by the learner's own code
  while a test runs is shown as the Console shows it, with its line ("AssertionError on line 7,
  in first_bad: ..."), not as the test's own message, and an empty message no longer leaves a
  trailing ": " in a test's error or in `rerun`; and a step-through figure that runs too long says
  "Stopped", as the code card does.
- The tutor's and the grader's calls go through `apiFetch`, the one way the browser calls
  Derive's server (commits `84b50c0` and `c925474`), ready for the hosting move.
- M1.9 Proof II: induction and recursion, live (`ready`) since 6 November: all six phases and 24
  exercises (a puzzle on whether tiles of three squares always cover a grid 1,024 wide with one
  square cut out, 5 recall, 7 explore predictions, 3 proofs of rules, 2 derivation steps and a
  written proof, 3 builds and a break-it, and the explain-back), four tiling figures, tutor notes
  with 12 misconceptions, and checks.json (42 items). It requires M1.6 and M1.8, builds on E1.5,
  and leads to M1.10, M5.1 and E1.10; E1.10 now builds on M1.9, and must list in `used` the M1.9
  concepts it uses. Reviewed by both (the simulated learner, 24 of 24 right with 17 findings; the
  independent reviewer, 1 blocker, 15 should-fix findings and 12 nits; in
  `derive-resume/review/M1.9-*.md`), and every finding applied apart from two optional nits
  (below): the explain-back's prompt now asks everything its rubric checks, with `maxWords: 500`;
  the puzzle's figure shows only the grid, and the summary no longer hints at the answer; titles,
  headings and set-up lines that answered their items are gone ("Odd or even" now heads the step
  with no base case); the facts about inequalities are stated, with their reasons, before
  $2^n > n^2$ uses them; the sum of the squares has a rule, "Factorise a quadratic", for its line
  6; the Build phase says that its rows and columns count from 0 where the figures count from 1,
  what `corners[i]` holds, that `==` between SymPy expressions asks whether they are written
  alike, why its formulas use `Rational`, and that the editor stops a program that runs too long;
  the tests no longer give away the break-it or the power fix; build-induction-check accepts
  SymPy's own True and False, and says, for a true claim judged False, where its base case is
  and how `==` compares; build-tiles tells lists appended instead of joined from an empty centre
  tile, and cuts every value it shows to 80 characters; the strong-induction summary and
  Definition say how `power` is proved right, instead of saying that any function that halves its
  argument is; placement asks three questions instead of one; and 18 rungs, the notes, five
  misconception cues and three wrong programs' reasons were rewritten. The reviewers' and the
  learner's 74 programs were run against the final tests (`derive-resume/m19walk/programs/`, with
  `make.py`, `run-all.sh` and `summary.py`): every right one passes, the four that leave SymPy's
  answer unsettled (an `Eq`, the None of `is_zero`, or both sides simplified and compared with
  `==`) fail with a message that says why, and every slip fails with a message that names its
  cause. `check:exercises` passes all its 42 items, the lesson was walked again in all six phases
  with no page errors other than the grader's 503 in local mode (store
  `derive-resume/m19walk/store-before-M1.9-walk.json`; the store after it is
  `store-after-M1.9-walk.json`), and its end-to-end tests pass at all three widths. Optional nits
  not done: a heavier outline on the last level of tiles, and the history of Bernoulli's
  inequality before Bernoulli (Sluse, 1668).
- Engine changes with M1.9: a new figure component, `TileGrid` (a grid 2, 4, 8 or 16 wide with
  one square cut out and its quarters dashed; the learner sets the width and the cut square and
  places the tiles a level at a time, as induction builds the covering; `counts` shows the tiles
  each level places, `tilesLocked` with `lockedNote` keeps the tiles closed until an exercise is
  done, and `gridOnly` shows the grid alone, for a puzzle). Its words come from `tilingWords` in
  `tiling.ts`, with unit tests, and never promise tiles the figure does not show. The expression
  checker reads a Greek letter typed as itself (β as `beta`, and α, γ, δ, ε, η, θ, λ, μ, ρ, σ, τ,
  φ and ω) when the item's symbols use its name. curriculum.json also syncs E1.8's `leadsTo`
  with its foreshadows of E1.9 and E3.2.

- E1.9 Testing and property-based testing, live (`ready`) since 6 November: all six phases and
  23 exercises (a puzzle on how many of 100 random lists of 10 losses from 1 to 1,000,000 show
  a sort that drops ties, 5 recall, 7 explore predictions, a derivation step, an estimate, a
  prediction and a proof of rules, 3 builds, a debug and a break-it, and the explain-back), two
  step-through figures and a new figure of random lists, tutor notes with 25 misconceptions, and
  checks.json (42 items). It requires E1.8 and E1.4, contrasts with M1.9, applies M1.2, M1.3 and
  M1.1, and foreshadows E1.12, E3.4 and E6.8; its properties are now used by E1.10 too, which
  builds on E1.9 and must list `E1.9/properties` in `used` (a sort checked against its two
  properties, in order and the same items). Reviewed by both (the simulated learner, 23 of 23
  right with 18 findings; the independent reviewer, 1 blocker, 10 should-fix findings and 11 nits;
  in `derive-resume/review/E1.9-*.md`, with the decisions in `E1.9-fix-plan.md`), and every
  finding applied: the card above the shrinking figure no longer answers its stop; derive-pairs
  now asks how long a list must be for one equal pair on average ($\sqrt{2N}$), not the count of
  pairs that E1.3 and E1.4 derived; the puzzle's Reveal shows the one-at-a-time product that the
  small-range item needs, and the birthdays say why 0.7 shared birthdays on average is not the
  chance; the shrinking proof's last line is split in two, the end (The loop stops) and the count
  of passes (Accumulator), and "pass" now means one pass of the loop everywhere, a "call" of the
  shrinker the whole sweep; the claims about real shrinkers are right (Hypothesis lowers equal
  numbers together, so `[3, 3]` from 1 to 10 ends as `[1, 1]`; repeated calls reach a result
  that no single removal can shrink); pytest is described as it is (files `test_*.py` or
  `*_test.py`, functions beginning `test`, run when started); the median test names the five
  wrong medians A to E, so the cases are chosen before any is named, and its tests catch a
  helper that calls the script's own `median`; the property check's tests catch a `check` that
  calls the script's own functions; the runner's starter says what stopped the program when a
  failing test escapes; derive-equivalent is about lists of whole numbers; and rewritten reveals,
  rungs, notes and nine new misconceptions. The reviewers' and the learner's 50 programs were run
  against the final tests (`derive-resume/e19walk/programs/` with `builds.mts`, log
  `builds-after-fixes.log`): every right one passes and every slip fails with a message that
  names its cause. `check:exercises` passes all its 42 items, the lesson was walked in all six
  phases with the mixed check and no page errors other than the grader's 503 in local mode
  (store `derive-resume/e19walk/store-before-E1.9-walk.json`, from `store-after-M1.9-walk.json`
  with M1.8, E1.8 and M1.9 moved to the week before by `prep-store.py` and E1.8 and M1.9 made
  provisional by `provisional.py`; the store after it is `store-after-E1.9-walk.json`), and its
  end-to-end tests pass at all three widths.
- Engine changes with E1.9: a new figure component, `TieLists` (100 random lists drawn from a
  seed, one square for each, filled and marked "=" when the list holds two equal numbers; the
  learner sets the length, from 2 to 20, and the largest number, 10 to 1,000,000, picks a list
  to read out, and draws new lists; its words come from `tieWords` and `listWords` in `ties.ts`,
  with unit tests). The step-through figure now shows a function inside a list, tuple, dict or
  set by its name, as `<function test_one>`, instead of `repr` with its memory address
  (`_is_function` in the harness); every other lesson's traces are unchanged (checked by tracing
  all 18 figures with the old and new harness).

Next, in order:

1. M1.10 Counting: permutations, combinations and the binomial theorem (first design notes in
   `derive-resume/m110plan.md`), then E1.10, M1.11, E1.11, M1.12 and E1.12, then the start of
   stage 2, each written, checked, reviewed by both and walked
   before it goes live, adding the remaining figure components as the lessons need them. The phase 2 features (item 3) come first once the
   hosting pull request has landed. E1.9 picks up E1.8's preview: tests that run on every change,
   and property-based tests. E1.10 must show how to give a class a `__hash__` that agrees with
   its `__eq__` (E1.7 promises it, and E1.10 now requires E1.7); the E1.8 reviewer suggests E1.8
   as a requirement of E1.10 too, with E1.10 among the uses of `E1.8/bisection`, since binary
   search is E1.8's search on a sorted list. The E1.7 reviewer suggests E1.7 as a requirement of
   E1.11, if E1.11 writes an iterator class, and of E3.4, if its configuration is a class.
2. When the hosting pull request lands: pages move to `src/server/app/` (a new page needs a line
   in `src/server/routes.ts` and a static shell in `src/app/`, copied from
   `src/app/today/page.tsx`); server components cannot use state or effects; client components
   call server actions through `src/lib/actions.ts` and use `refreshPage()` from
   `src/lib/wire/client.tsx`; `npm run dev` runs the site on 3000 and the server on 3101; walk
   scripts wait for `html[data-page="ready"]`; and `npm run build:api` rewrites
   `src/generated/client-modules.ts`, which is committed. Tell that thread before changing a
   route's shape or adding a route.
3. The phase 2 features: the "This confused me" button (records the exact step as a notebook
   entry of kind `confused`; `NOTEBOOK_KINDS` already has it), automatic revision flags, the Map
   coloured by mastery with what unlocks next, the concept map, the novice explain-back mode
   (`noviceQuestion` in `src/lib/tutor/grade.ts` already picks an authored question) and the
   course viva (the tutor's `examiner` mode).
4. A follow-up from the M1.7 checks: give the workspace `scroll-padding` for its sticky header
   and footer, so that a control reached by the keyboard is never hidden under them (WCAG
   2.4.11, focus not obscured).
5. A nit from the E1.7 review, to fix once the hosting pull request has landed, since that pull
   request changes the file: the comment above `TraceFrame` in `src/lib/python/client.ts` says
   that `refs` holds tags only for a list, dict or set, though it holds them for objects of the
   program's classes too.

### Working notes

- Local walk-through: `DERIVE_LOCAL_STORE=1 DERIVE_SHOW_DRAFTS=1 npm run dev` (the site on
  port 3000, Derive's server on 3101), driven with Playwright (Chromium is preinstalled). Learner
  data is in `.derive-local/store.json`. A page is ready to read once `<html>` has
  `data-page="ready"`; its content arrives from the server after the page loads.
  Since the redesign, phase pages keep their addresses but render full screen. "Start {phase}",
  "Finish {phase}" and "Finish the lesson" keep their labels (the finish button is now in the
  footer), and exercise cards keep `data-exercise`. At 1,280 px and wider the outline is an
  `<aside>` as well, so a walk that reads `aside` text should narrow it to the reading.
  A later lesson unlocks only when the earlier one's concepts are mastered or provisional, and
  only one new lesson starts per day, so a walk of M1.2 needs M1.1's concepts set provisional and
  M1.1's start dated the day before. Choices are now visually hidden inputs inside their labels,
  so a walk checks them with `check({ force: true })`.
- Walking M1.7: `derive-resume/store-before-M1.7-walk.json` is the store after the E1.6 walk with
  E1.4, E1.5 and E1.6 started before Monday 2 November, E1.6's concepts provisional and every
  card's due date moved to 20 November, so that M1.7 can begin on 6 November. Copy it to a
  store folder and start the production build on it (`DERIVE_LOCAL_STORE=1
  DERIVE_LOCAL_DIR=<folder> DERIVE_SHOW_DRAFTS=1 npx next start -p 3100`). `walk-m17.cjs` walks
  the phases (`node walk-m17.cjs overview puzzle recall explore derive build explain`),
  `walk-m17-codefb.cjs` prints the whole result of each build's wrong programs, `m17figs.cjs`
  takes the figures in both themes at both widths, and `store-after-M1.7-rewalk.json` is the
  store after the second walk. The M1.7 scripts name `/home/claude/derive` as the repository;
  change that if the clone is elsewhere. Probe scripts that load Pyodide in Node must run from
  the repository's folder, since it finds Pyodide from there.
- Walking E1.7: copy `derive-resume/store-before-E1.7-walk.json` into a store folder with
  `prep-store.py <snapshot> <folder>/store.json M1.7=<yesterday>`, so that a new lesson can
  begin today, start the production build on it as above, and run `walk-e17.cjs` and
  `walk-e17-codefb.cjs` from `derive-resume/e17walk/`. `trace-widths.cjs <url>` reports, at six
  widths, whether a trace figure's code is cut and whether its variables sit beside it or below.
  A production server runs as `next-server`, so stop it with `pkill -f next-server`;
  `pkill -f "next start"` misses it, and a second `next start` on the same port then fails
  while the old server goes on serving pages whose styles the new build has replaced.
- In development, a build page whose code is wider than its box logs a hydration warning:
  `ScrollStops`, in the root layout, gives the `<pre>` a tab stop before that part of the page
  has hydrated. It happens on E1.6's build page too, changes nothing a learner sees, and does
  not appear in production builds; deferring `updateScrollStops` until hydration ends would
  silence it.
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

## Hosting

- The site: a static export (`out/`, 457 pages) on GitHub Pages under `/Derive`. Every page is a
  shell; once it loads, `WireHost` (`src/lib/wire/client.tsx`) asks Derive's server for the
  page's content and renders it, loading the client components it names. An address with no
  file falls to 404.html, which asks the server all the same, so a lesson written after the
  last build still opens. A new page's content is laid out hidden and shown once every font it
  uses is in (KaTeX's included), or after 1.5 s, so text does not jump as fonts arrive: M1.8's
  Explore, which shifted by 0.25 on main before `d4eb2d0`, shifts by 0 at tablet width with the
  processor slowed four times. That commit's `src/app/fonts/katex.ts` was therefore dropped
  here, since lesson pages are rendered by the server and its fonts never reached the browser.
- The server: `src/server/handler.ts`, bundled by `scripts/build-api.ts` with every lesson file
  and every written phase's compiled MDX packed in (about 3.3 MB, under Supabase's 20 MB). It runs
  as the Edge Function `derive-api` in Mumbai (`x-region: ap-south-1`), verifies the learner's
  session itself, and answers only https://arnav-raja.github.io (`DERIVE_ALLOWED_ORIGINS`
  changes that). Locally the same handler runs in `.derive-build/server.mjs`.
- Sign-in runs in the browser with Supabase Auth (`src/lib/auth-client.ts`); the session is
  sent as a bearer token with every call.
- `.github/workflows/publish.yml` builds both, deploys the server, checks its health route
  reports the new commit, then publishes the site.

## Waiting on Arnav

- Three steps for the move to GitHub Pages, asked on 6 November in the hosting thread:
  1. https://github.com/arnav-raja/Derive/settings/pages: Source "GitHub Actions".
  2. https://supabase.com/dashboard/project/spivlvrkjsqxjeonnmvd/functions/secrets: the secret
     `ANTHROPIC_API_KEY` (the tutor's key).
  3. A token from https://supabase.com/dashboard/account/tokens, added as the repository secret
     `SUPABASE_ACCESS_TOKEN` at https://github.com/arnav-raja/Derive/settings/secrets/actions/new,
     so that Actions can deploy the server.
  Until all three are done the Publish workflow stops with a message that names the missing one.
- Saying the Vercel project can be deleted, once the GitHub Pages site and its tutor work.

- Confirming the Supabase tool's prompt to delete the test sign-up address (he said yes to the
  removal on 6 November; the first prompt timed out). Sign-up is closed anyway once the one
  account exists, so nothing waits on it.

The three set-up steps asked on 4 November are done or no longer needed. Checked on
5 November: Arnav's account exists and is confirmed (created on 4 November), and `/api/health`
on production reports the tutor key configured. "Confirm email" is still on in Supabase, which
no longer matters now that the one account exists.

## Notes

- The approved plan's Claude Doc would not open from the session of 6 November (access denied;
  it read fine on 5 November). Word-for-word copies are in the project files folder,
  `derive-resume/plan/`: the Plan tab as text (`plan-2026-11-05.txt`, read on 5 November at
  06:08 UTC, before the course update, so its codes, stages and hours are superseded by
  `docs/course-update.md`), the Lessons tab after the update, and `plan-excerpts.md` with the
  roadmap, content production, tutor, surfaces, practice types and figure components. Phase 2
  (the next lessons and the phase 2 features) has its own thread, started on 6 November.
- This container cannot reach `*.supabase.co` or `*.github.io`. The Publish workflow checks the
  deployed server itself (its health route must report the commit just built), and a page can be
  read through the Exa fetch tool.
