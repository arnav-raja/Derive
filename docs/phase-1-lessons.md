# Phase 1 lessons: concept plan

The working plan for the 12 phase 1 lessons, kept here so that writing can resume in any
session. Concept ids start with the lesson code. Each taught concept needs at least two later
uses; every target must be a descendant in the graph, and a written target must list the
concept in its `used`. An E or L lesson that uses an M concept must link to that M lesson.

## Uses already promised by M1.1

| Concept | Used by | Note |
| --- | --- | --- |
| M1.1/units-as-algebra | M1.4, E5.3, E6.1 | M1.4: a slope has units |
| M1.1/powers-of-ten | M1.2, M1.5, E1.1, E6.1 | M1.2 generalises the exponent rules; M1.5: log10 counts powers of ten; E1.1: `3.15e23` literals |
| M1.1/dimensional-analysis | E5.3, E6.1, M11.6 | |
| M1.1/fermi-estimation | E1.4, E6.1, L5.11 | E1.4: estimating running time; skill 2 |

So M1.2, M1.5 and E1.1 list `M1.1/powers-of-ten` in `used`, M1.4 lists
`M1.1/units-as-algebra`, and E1.4 lists `M1.1/fermi-estimation`. E1.1 and E1.4 must link to
M1.1 (rule 6).

## Draft concepts for the remaining lessons

| Lesson | Concepts (usedBy) |
| --- | --- |
| M1.2 | expression-trees (E1.1, M5.6); field-axioms (M1.6, M2.5, M10.2); equivalence (M1.8, E1.9); solving-equations (M1.3, M1.4, M2.6); exponent-rules (M1.5, M3.5) |
| M1.3 | function-as-mapping (E1.3, M2.4, M1.4); injective-surjective (M2.7, M12.8); composition (M3.4, M2.5, E1.3); inverse-functions (M1.5, M4.12) |
| M1.4 | linear-functions (M2.4, L1.2, M3.1); average-rate-of-change (M3.1, M3.7); quadratics (M3.6, M9.3); completing-the-square (M3.6, M4.8, M3.11) |
| M1.5 | exponential-growth (M3.5, M11.6); logarithms (M8.1, M10.3, M3.5); log-rules (M8.1, M10.3, and one more descendant: not M7.2); log-scales (M11.6, L5.2, and one more descendant: not E2.6) |
| M1.6 | sigma-notation (M4.5, M3.8, and one more descendant: not M2.3); arithmetic-series (M1.9, E1.10); geometric-series (L6.3, M9.5); product-notation (M1.10, M7.2) |
| E1.1 | values-and-types (E1.2, E1.6, M10.1); variables-as-names (E1.2, E1.3, E1.4); evaluation-order (E1.2, E1.8); floats-are-approximate (M10.1, M10.2) |
| E1.2 | conditions (E1.3, E1.5, M4.1); loops (E1.3, E1.4, M4.1); loop-invariants (E1.10, E1.9); accumulator-pattern (E1.4, E1.6, M4.10) |
| E1.3 | defining-functions (E1.4, E1.5, E1.7, L1.1); scope (E1.5, E1.7); pure-functions (E1.9, E4.10); abstraction (E1.7, E1.12, E3.4) |
| E1.4 | lists (E1.6, E1.10, E2.1); dicts-and-sets (E1.6, E1.10, E8.3); aliasing-and-mutation (E2.3, E4.2); cost-of-operations (E1.10, E2.8) |
| E1.5 | base-and-recursive-case, call-stack, recursive-structures, memoisation: E1.10 plus one other descendant each (not L2.4 or L6.3; E1.5's descendants include L3.1, L3.2, L6.8, M8.2, E8.3) |
| E1.6 | strings-as-sequences (L3.2, E1.12); unicode-and-bytes (L3.2, E8.2; not M8.6); files (E1.12, E2.9, E8.2); parsing-and-formatting (E1.12, E2.9) |

Targets marked "not" failed the descendant check and must be replaced when that lesson is
written; check candidates against the graph before writing `usedBy`.

## M1.2 outline (not yet written)

Algebra as a language: why the rules hold. Requires M1.1; uses `M1.1/powers-of-ten`;
`contrastsWith` E1.1 (in algebra `x = x + 1` has no solution; in Python it replaces the value
named `x`); foreshadows E1.1 and M10.2.

- Puzzle: Python says `(0.1 + 0.2) + 0.3 == 0.1 + (0.2 + 0.3)` is False. Predict, then the
  reveal: the computer rounds after every addition, so grouping changes what is rounded.
- Recall: 3 + 4 × 2; a quotient of powers of ten; (−3) × (−4); 7 × 98 as 7 × 100 − 7 × 2.
- Explore: expressions as trees (precedence and brackets decide the shape); 8 − 3 − 2 versus
  its two groupings; which operations ignore grouping (addition and multiplication); the
  distributive law as a change of tree; a three-significant-figure calculator in which
  (1 + 0.004) + 0.004 gives 1.00 but 1 + (0.004 + 0.004) gives 1.01. This needs a new
  rounding option on `ExpressionTree` that rounds every operation's result.
- Derive: a × 0 = 0 as a worked chain of rules; the learner cites the rules for
  (−1)(−1) + (−1) = 0, hence (−1)(−1) = 1, with the number-pattern argument as a second
  angle; expand (a + b)²; refute (a + b)² = a² + b² with one counterexample; x and
  x(x − 1)(x − 2) + x agree at 0, 1 and 2 but are not equivalent; a^0 and a^(−n) defined so
  the exponent rules keep holding; solve T = C/(RY) for R; squaring both sides adds a
  solution, and dividing by x loses one.
- Build: with a given 3-significant-figure rounding helper, the learner chooses a, b and c that
  break associativity, and sees that no choice breaks commutativity; break it with float
  grouping; compare with the library: SymPy's `expand` and `simplify` (check that learner code
  can import SymPy in the worker first).
- Explain: a friend says the rules of algebra, and (−1)(−1) = 1, are only conventions.
