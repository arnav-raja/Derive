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
- M1.5 Exponentials and logarithms: written, walked, and reviewed by both (findings in the
  session scratchpad, summarised in the commit). All findings applied on 5 November: a fifth
  recall question on when a function can be undone, a paragraph setting doubling against steady
  change, the positive root chosen for fractional powers, the logarithm's domain stated among
  the real numbers, the product rule named and the change of base given for any two bases,
  build reordered so that underflow comes before the log score, tests that guard the starter and
  check that `math.log10` is really used, SymPy's rules tested without `force=True`, rewritten
  rungs, and new later uses (M1.12, L1.6, M7.2, M10.1), with M7.2 now requiring M1.5. All 51
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
  the SymPy build; rewritten rungs and misconceptions; and new bridges for M1.5, M1.9 and M9.5. All 49 items pass `check:exercises`. The changed parts
  have been walked again for the overview, Puzzle and Recall; the rest is step 1 below.
- E1.1 Programs as precise instructions: values, variables and expressions: written on
  5 November, and all 44 items pass `check:exercises`. Not yet walked or reviewed. Its new engine
  parts: `FloatLine` (the exact value a float holds, with its neighbours, or an exact sum set
  against its float) and `ExpressionTree` in Python notation.
- Engine and checks from this round: the content check skips fenced code when it looks for
  imports and components, and requires the Connect phase to preview 1 to 3 later lessons; the
  SymPy answer checker treats S, N, O, Q and I as plain letters and reports an answer it cannot
  read instead of failing.

### Resume here

1. Finish the M1.6 walk of the changed parts: Explore, Derive, Build and Explain. Check that the
   staircase's turn button is hidden until the 100-token count is answered, that the partial-sums
   readouts end with "…" at r = 0.9, 0.5 and 0.7 (with "short of where it is heading"), the
   staircase at phone width, and no console errors. The walk scripts and a local store with
   M1.1 to M1.5 done are in the project files folder, `derive-resume/` (copy them into the session
   scratchpad first). Restore `.derive-local/store.json` from `store-before-M1.6-walk.json` with
   M1.5's progress dated a day earlier, then run
   `CODE=M1.6 node walk-m16.cjs overview puzzle recall explore`, then `derive build explain`.
2. E1.1: walk it end to end, with figure screenshots of `FloatLine` in both modes and of
   `ExpressionTree` in Python notation, in both themes, at 1,100 and 390 px. Then the reviewer and
   the simulated learner (views from `python3 -I scripts/learner-view.py . E1.1 <scratch dir>`),
   their findings applied, and a commit.
3. Write E1.2 to E1.6 from `docs/phase-1-lessons.md`, the same way, keeping the uses that M1.1 and
   E1.1 promise (listed there). Fix these descendant targets on the way: E1.5 not L2.4 or L6.3,
   E1.6 unicode-and-bytes not M8.6.
4. Tests and CI: Playwright end-to-end tests (no config yet) with axe and screenshots in both
   themes; unit tests for the mixed check, placement and the review queue; add
   `check:exercises` to CI; update the commands table in CLAUDE.md.
5. Tutor leak tests once the Anthropic key is in Vercel, recorded in each lesson's leaks.json;
   then set lessons to `ready`.
6. Finish phase 1: build, push, check the deployment and `/api/health`, and remove the test
   address from `private.allowed_emails` (needs Arnav's approval on the prompt).

### Working notes

- Local walk-through: `DERIVE_LOCAL_STORE=1 DERIVE_SHOW_DRAFTS=1 npx next dev -p 3100`, driven
  with Playwright (Chromium is preinstalled). Learner data is in `.derive-local/store.json`.
  A later lesson unlocks only when the earlier one's concepts are mastered or provisional, and
  only one new lesson starts per day, so a walk of M1.2 needs M1.1's concepts set provisional and
  M1.1's start dated the day before.
- The pace governor also allows at most three new lessons a week (from Monday), counted from
  each Puzzle's start, so a walk late in a week needs the earlier starts moved back. A recall
  question can be answered only once, so a walk answers each one a single time.
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
