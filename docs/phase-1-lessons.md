# Phase 1 lessons: concept plan

The working plan for the 12 phase 1 lessons, kept here so that writing can resume in any
session. Concept ids start with the lesson code. Each taught concept needs at least two later
uses; every target must be a descendant in the graph, and a written target must list the
concept in its `used`. An E or L lesson that uses an M concept must link to that M lesson.

## Uses already promised by M1.1

| Concept | Used by | Note |
| --- | --- | --- |
| M1.1/units-as-algebra | M1.4, E6.3, E7.1 | M1.4: a slope has units |
| M1.1/powers-of-ten | M1.2, M1.5, E1.1, E7.1 | M1.2 generalises the exponent rules; M1.5: log10 counts powers of ten; E1.1: `3.15e23` literals |
| M1.1/dimensional-analysis | E6.3, E7.1, L6.2 | |
| M1.1/fermi-estimation | E1.4, E7.1, L6.10 | E1.4: estimating running time; skill 2 |

So M1.2, M1.5 and E1.1 list `M1.1/powers-of-ten` in `used`, M1.4 lists
`M1.1/units-as-algebra`, and E1.4 lists `M1.1/fermi-estimation`. E1.1 and E1.4 must link to
M1.1 (rule 6).

## Uses already promised by E1.1

| Concept | Used by |
| --- | --- |
| E1.1/values-and-types | E1.2, E1.6, M13.1 |
| E1.1/variables-as-names | E1.2, E1.3, E1.4 |
| E1.1/evaluation-order | E1.2, E1.8 |
| E1.1/floats-are-approximate | M13.1, M13.2 |

So E1.2 lists `E1.1/values-and-types`, `E1.1/variables-as-names` and `E1.1/evaluation-order`
in `used`, E1.3 and E1.4 list `E1.1/variables-as-names`, and E1.6 lists
`E1.1/values-and-types`.

## Draft concepts for the remaining lessons

| Lesson | Concepts (usedBy) |
| --- | --- |
| M1.2 | expression-trees (E1.1, M6.5); field-axioms (M1.6, M2.7, M13.2); equivalence (M1.8, E1.9); solving-equations (M1.3, M1.4, M2.4); exponent-rules (M1.5, M3.6) |
| M1.3 | function-as-mapping (E1.3, M2.6, M1.4); injective-surjective (M2.8, M15.9); composition (M3.4, M2.7, E1.3); inverse-functions (M1.5, M8.7) |
| M1.4 | linear-functions (M2.6, L1.2, M3.1); average-rate-of-change (M3.1, M3.8); quadratics (M3.7, M10.4); completing-the-square (M3.7, M4.9, M3.12) |
| M1.5 | exponential-growth (M3.6, L6.2, M1.12); logarithms (M11.1, M13.3, M3.6); log-rules (M11.1, M13.3, L1.6, M9.2); log-scales (L6.2, M13.1) |
| M1.6 | sigma-notation (M4.6, M3.9, M1.9); arithmetic-series (M1.9, M1.10); geometric-series (L7.3, M14.2); product-notation (M1.10, M9.2) |
| E1.1 | values-and-types (E1.2, E1.6, M13.1); variables-as-names (E1.2, E1.3, E1.4); evaluation-order (E1.2, E1.8); floats-are-approximate (M13.1, M13.2) |
| E1.2 | conditions (E1.3, E1.5, M4.1); loops (E1.3, E1.4, M4.1); loop-invariants (E1.10, E1.9); accumulator-pattern (E1.4, E1.6, M4.11) |
| E1.3 | defining-functions (E1.4, E1.5, E1.7, L1.1); scope (E1.5, E1.7); pure-functions (E1.9, E5.10); abstraction (E1.7, E1.12, E3.4) |
| E1.4 | lists (E1.6, E1.10, E2.1); dicts-and-sets (E1.6, E1.10, E9.3); aliasing-and-mutation (E2.3, E5.2); cost-of-operations (E1.10, E2.7) |
| E1.5 | base-and-recursive-case, call-stack, recursive-structures, memoisation: E1.10 plus one other descendant each (not L3.4 or L7.3; E1.5's descendants include L4.1, L4.2, L7.8, M11.3, E9.3) |
| E1.6 | strings-as-sequences (L4.2, E1.12); unicode-and-bytes (L4.2, E9.2; not M11.7); files (E1.12, E2.8, E9.2); parsing-and-formatting (E1.12, E2.8) |

Targets marked "not" failed the descendant check and must be replaced when that lesson is
written; check candidates against the graph before writing `usedBy`.

## Written so far

M1.1 to M1.6, E1.1 and E1.2 are written; their files in `content/lessons/` are now the source,
and the outlines that were here have been removed. E1.1 and E1.2 still need their review
findings applied. E1.2 kept the draft concepts and later uses above, and its foreshadows are
E1.3, M4.1 and E1.10. So E1.3 lists `E1.2/conditions` and `E1.2/loops` in `used`, E1.4 lists
`E1.2/loops` and `E1.2/accumulator-pattern`, E1.5 lists `E1.2/conditions`, and E1.6 lists
`E1.2/accumulator-pattern`. M1.4 and M1.5 carry both sides of the contrast
between linear change (the same amount each step) and exponential change (the same factor
each step).
