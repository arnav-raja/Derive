# Course update of 5 November 2026

Arnav approved the course update plan (the Claude Doc at
https://claude.ai/artifact/4ncP8AwPJM1JxBnYK3WFLj) on 5 November 2026, and it was applied the
same day. This file records what changed, so that notes written before the change can still be
read. Everything else in `docs/` already uses the new codes.

## What changed

- 29 courses and 282 lessons became 34 courses and 332 lessons. The nine capstones keep their
  codes; their prerequisites now point at the new lesson codes.
- Five new courses: M5 Calculus II, M8 Probability II, M12 Linear algebra III, L2 Statistical
  learning and E4 Computer systems for ML engineers.
- Old M6 (Linear algebra II) is now M7 and the computing half of M12. Old M9 (Optimisation) is
  now M10 (convex optimisation) and M14 (training deep networks). Old M11 (high-dimensional
  probability) was shared out, lesson by lesson, to the courses that use it.
- Seven pairs of lessons were merged: M5.3 with M5.4 (now M6.3), M11.1 with M11.2 (now M8.5),
  L3.3 with L3.4 (now L4.3), E2.6 with E2.7 (now E2.6), L5.10 with L7.7 (now L8.7), M11.4 into
  L2.6 (now L3.6) and M11.6 into L5.2 (now L6.2).
- 57 lessons are new (listed below), several of them drawn from parts of old lessons: M2.5 from
  M2.2 and M2.9, and M7.2 from the change of basis in M2.9.
- The written lessons, M1.1 to M1.6 and E1.1, keep their codes and their content; only their
  links to later lessons were re-pointed. No learner data had been stored, so nothing in the
  database moved.

## Stages

| Stage | Courses | Lessons | Hours |
| --- | --- | --- | --- |
| 1 Foundations | M1, E1 | 24 | 80 |
| 2 Core | M2, M3, M4, E2, E3 | 52 | 175 |
| 3 Bridge | M5, M6, M7, M8, M9, M10, M11, L1, L2, E4 | 92 | 315 |
| 4 Deep learning | M12, M13, M14, L3, L4, E5, E6 | 67 | 280 |
| 5 Frontier | M15, L5, L6, L7, L8, L9, E7, E8, E9, E10 | 97 | 465 |

About 1,315 hours in all, up from 1,100.

## Where each old lesson went

| Old course | Now in | Lessons whose code changed |
| --- | --- | --- |
| M1 Foundations: numbers, functions and proof | M1 | No change |
| M2 Linear algebra I: vectors, matrices and linear maps | M2 | M2.2 to M2.3; M2.3 to M2.2; M2.4 to M2.6; M2.5 to M2.7; M2.6 to M2.4; M2.7 to M2.8; M2.8 to M2.9; M2.9 to M2.5 |
| M3 Calculus I: change and accumulation | M3 | M3.5 to M3.6; M3.6 to M3.7; M3.7 to M3.8; M3.8 to M3.9; M3.9 to M3.10; M3.10 to M3.11; M3.11 to M3.12 |
| M4 Probability I: reasoning under uncertainty | M4, M8 | M4.2 to M4.3; M4.3 to M4.4; M4.4 to M4.5; M4.5 to M4.6; M4.6 to M4.7; M4.7 to M4.8; M4.8 to M4.9; M4.9 to M4.10; M4.10 to M4.11; M4.11 to M4.12; M4.12 to M8.7 |
| M5 Multivariable and matrix calculus | M6 | M5.1 to M6.1; M5.2 to M6.2; M5.3 to M6.3; M5.4 to M6.3; M5.5 to M6.4; M5.6 to M6.5; M5.7 to M6.6; M5.8 to M6.7; M5.9 to M6.8; M5.10 to M6.9 |
| M6 Linear algebra II: structure and decompositions | M7, M12 | M6.1 to M7.3; M6.2 to M7.4; M6.3 to M7.7; M6.4 to M7.8; M6.5 to M7.9; M6.6 to M7.10; M6.7 to M7.11; M6.8 to M12.1; M6.9 to M12.2; M6.10 to M12.3 |
| M7 Statistics and inference | M9 | M7.1 to M9.1; M7.2 to M9.2; M7.3 to M9.5; M7.4 to M9.6; M7.5 to M9.7; M7.6 to M9.8; M7.7 to M9.9; M7.8 to M9.10; M7.9 to M9.11; M7.10 to M9.12 |
| M8 Information theory | M11 | M8.1 to M11.1; M8.2 to M11.3; M8.3 to M11.4; M8.4 to M11.5; M8.5 to M11.6; M8.6 to M11.7; M8.7 to M11.9 |
| M9 Optimisation | M10, M14 | M9.1 to M10.1; M9.2 to M10.2; M9.3 to M10.4; M9.4 to M14.1; M9.5 to M14.2; M9.6 to M14.3; M9.7 to M14.4; M9.8 to M14.5; M9.9 to M10.7; M9.10 to M14.7 |
| M10 Numerical computing and floating point | M13 | M10.1 to M13.1; M10.2 to M13.2; M10.3 to M13.3; M10.4 to M13.4; M10.5 to M13.5; M10.6 to M13.6; M10.7 to M13.7 |
| M11 High-dimensional probability and the maths of scale | M8, M12, M14, L2, L3, L6 | M11.1 to M8.5; M11.2 to M8.5; M11.3 to M12.7; M11.4 to L3.6; M11.5 to M14.6; M11.6 to L6.2; M11.7 to L2.7 |
| M12 Stochastic processes and sampling | M15 | M12.1 to M15.1; M12.2 to M15.2; M12.3 to M15.3; M12.4 to M15.5; M12.5 to M15.6; M12.6 to M15.7; M12.7 to M15.8; M12.8 to M15.9 |
| L1 Learning from data | L1 | L1.7 to L1.8; L1.8 to L1.9; L1.9 to L1.10; L1.10 to L1.11 |
| L2 Neural networks from scratch | L3 | L2.1 to L3.1; L2.2 to L3.2; L2.3 to L3.3; L2.4 to L3.4; L2.5 to L3.5; L2.6 to L3.6; L2.7 to L3.7; L2.8 to L3.8; L2.9 to L3.9; L2.10 to L3.10; L2.11 to L3.11; L2.12 to L3.12 |
| L3 Sequence models and the Transformer | L4 | L3.1 to L4.1; L3.2 to L4.2; L3.3 to L4.3; L3.4 to L4.3; L3.5 to L4.4; L3.6 to L4.5; L3.7 to L4.6; L3.8 to L4.7; L3.9 to L4.8; L3.10 to L4.9; L3.11 to L4.10; L3.12 to L4.11 |
| L4 Representation learning and generative models | L5 | L4.1 to L5.1; L4.2 to L5.2; L4.3 to L5.6; L4.4 to L5.7; L4.5 to L5.8; L4.6 to L5.9; L4.7 to L5.10; L4.8 to L5.11 |
| L5 Large language models: pretraining and scaling | L6, L8 | L5.1 to L6.1; L5.2 to L6.2; L5.3 to L6.3; L5.4 to L6.4; L5.5 to L6.5; L5.6 to L6.6; L5.7 to L6.7; L5.8 to L6.8; L5.9 to L6.9; L5.10 to L8.7; L5.11 to L6.10 |
| L6 Reinforcement learning | L7 | L6.1 to L7.1; L6.2 to L7.2; L6.3 to L7.3; L6.4 to L7.4; L6.5 to L7.5; L6.6 to L7.6; L6.7 to L7.7; L6.8 to L7.8; L6.9 to L7.9; L6.10 to L7.10 |
| L7 Post-training and alignment | L8 | L7.1 to L8.1; L7.2 to L8.2; L7.3 to L8.3; L7.4 to L8.4; L7.5 to L8.5; L7.6 to L8.6; L7.7 to L8.7; L7.8 to L8.9; L7.9 to L8.10; L7.10 to L8.11 |
| L8 Interpretability and the science of deep learning | L9 | L8.1 to L9.1; L8.2 to L9.2; L8.3 to L9.3; L8.4 to L9.4; L8.5 to L9.5; L8.6 to L9.6; L8.7 to L9.7; L8.8 to L9.9; L8.9 to L9.10 |
| E1 Programming from zero in Python | E1 | No change |
| E2 Numerical Python and your own visualisations | E2 | E2.7 to E2.6; E2.8 to E2.7; E2.9 to E2.8 |
| E3 Software engineering for ML research | E3 | No change |
| E4 PyTorch from the inside | E5 | E4.1 to E5.1; E4.2 to E5.2; E4.3 to E5.3; E4.4 to E5.4; E4.5 to E5.5; E4.6 to E5.6; E4.7 to E5.7; E4.8 to E5.8; E4.9 to E5.9; E4.10 to E5.10 |
| E5 GPUs and performance engineering | E6 | E5.1 to E6.1; E5.2 to E6.2; E5.3 to E6.3; E5.4 to E6.4; E5.5 to E6.5; E5.6 to E6.6; E5.7 to E6.7; E5.8 to E6.8; E5.9 to E6.9; E5.10 to E6.10; E5.11 to E6.11 |
| E6 Distributed training | E7 | E6.1 to E7.1; E6.2 to E7.2; E6.3 to E7.3; E6.4 to E7.4; E6.5 to E7.5; E6.6 to E7.6; E6.7 to E7.7; E6.8 to E7.8; E6.9 to E7.9; E6.10 to E7.10 |
| E7 Inference and serving | E8 | E7.1 to E8.1; E7.2 to E8.2; E7.3 to E8.3; E7.4 to E8.4; E7.5 to E8.6; E7.6 to E8.7; E7.7 to E8.8; E7.8 to E8.9; E7.9 to E8.10 |
| E8 Data engineering at scale | E9 | E8.1 to E9.1; E8.2 to E9.2; E8.3 to E9.3; E8.4 to E9.4; E8.5 to E9.5; E8.6 to E9.6; E8.7 to E9.8 |
| E9 Research engineering, evaluation and RL systems | E10 | E9.1 to E10.1; E9.2 to E10.2; E9.3 to E10.3; E9.4 to E10.4; E9.5 to E10.5; E9.6 to E10.6; E9.7 to E10.7; E9.8 to E10.8 |

## New lessons

| Code | Title |
| --- | --- |
| M3.5 | The mean value theorem, and what a derivative guarantees |
| M4.2 | The axioms of probability, the union bound and inclusion-exclusion |
| M5.1 | Sequences: convergence, rates and completeness |
| M5.2 | Infinite series and power series |
| M5.3 | Convex functions and Jensen's inequality |
| M5.4 | Uniform convergence, and differentiating under the integral sign |
| M5.5 | Laplace's method and Stirling's formula: approximating integrals by Gaussians |
| M5.6 | Differential equations: growth, decay and gradient flow |
| M5.7 | Fixed points and contraction mappings |
| M6.10 | Vector fields, divergence and the continuity equation |
| M7.1 | Vector spaces beyond lists: functions, polynomials and weights |
| M7.2 | Linear maps, change of basis and similarity |
| M7.5 | Inner products, orthonormal bases and adjoints |
| M7.6 | Norms and duality: matrix norms, covectors and dual norms |
| M8.1 | Conditional expectation: best prediction and the law of total variance |
| M8.2 | Functions of random variables and the change-of-variables formula |
| M8.3 | Sums of random variables and moment generating functions |
| M8.4 | Tail bounds: Markov, Chebyshev, Jensen and Chernoff |
| M8.6 | Order statistics, maxima and the Gumbel-max trick |
| M8.8 | Importance sampling and variance reduction |
| M9.3 | Fisher information and the asymptotics of maximum likelihood |
| M9.4 | Exponential families and generalised linear models |
| M10.3 | Recognising convex problems: least squares, linear and quadratic programming |
| M10.5 | Steepest descent under a norm |
| M10.6 | Non-smooth problems: subgradients, proximal steps and projections |
| M11.2 | Typical sequences and the source coding theorem |
| M11.8 | Differential entropy and Gaussian information |
| M11.10 | f-divergences and variational bounds: Pinsker, Donsker-Varadhan and InfoNCE |
| M11.11 | Rate-distortion and quantisation |
| M11.12 | Channel capacity: how many bits a channel, or a network, can carry |
| M12.4 | Kronecker products and the vec trick |
| M12.5 | Fast transforms: circulant matrices, the DFT and the Hadamard transform |
| M12.6 | The matrix exponential and linear dynamical systems |
| M14.8 | Minimax problems and saddle points |
| M15.4 | The Poisson process: arrivals, failures and queues |
| L1.7 | Generative classifiers: naive Bayes and discriminant analysis |
| L2.1 | Kernel methods: feature maps, the kernel trick and the representer theorem |
| L2.2 | Support vector machines and maximum margins |
| L2.3 | Gaussian processes: regression with uncertainty |
| L2.4 | Decision trees |
| L2.5 | Bagging and random forests |
| L2.6 | Boosting: gradient descent in function space |
| L4.12 | Linear-time sequence models: linear attention and state-space models |
| L5.3 | Adversarial training: generative adversarial networks |
| L5.4 | Discrete latents: VQ-VAEs and tokenisers for images and audio |
| L5.5 | Energy-based models and the partition function |
| L8.8 | Agents: tool use, environments and long-horizon tasks |
| L9.8 | Attribution graphs: tracing computation with transcoders |
| E4.1 | How a computer runs a program: processors, memory and caches |
| E4.2 | C for Python programmers: pointers, memory and compilation |
| E4.3 | Compilers and just-in-time compilation |
| E4.4 | Processes, threads and the operating system |
| E4.5 | Concurrency in Python: threads, processes, async and the GIL |
| E4.6 | Storage and I/O: the page cache and fast data loading |
| E4.7 | Networks for ML engineers: latency, bandwidth and remote calls |
| E8.5 | Prefix caching, disaggregated serving and structured outputs |
| E9.7 | Synthetic data: generation, filtering and verification |
