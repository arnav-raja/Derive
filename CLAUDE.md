# Derive

A private school for one learner, Arnav, covering the mathematics, machine learning and ML
engineering used at frontier AI labs, taught the way Feynman worked: rebuild it, explain it
simply, never fool yourself. Derive is for Arnav alone and will never open to others, so it has
no payments, legal pages, server-side grading or multi-user features.

The approved plan is the Claude Doc at https://claude.ai/artifact/VtLMSsZy3rxJve2ymitoXU.
Where work stands, and what comes next, is in docs/STATUS.md. Read it first, and update it
before you stop.

## Working agreements

- Arnav does the minimum manual work; Claude does everything else. Ask him only for things no
  tool can do (an account, a secret pasted into a dashboard, an approval for spending or an
  irreversible step), once, with a direct link and the fewest steps.
- Always execute the complete plan, phase by phase; never stop at a partial plan.
- Arnav must be able to study a phase as soon as it is complete: each lesson goes live
  (`status: ready`) once it is written and has passed its checks, both reviews and a
  walk-through. The tutor leak tests do not hold a lesson back, and every lesson opens with the
  tutor working (Arnav's decisions of 6 November).
- "Pause" from Arnav: finish or revert the step in hand, commit and push, update docs/STATUS.md,
  then stop. "Resume": read docs/STATUS.md and carry on from its next step.
- Writing: Indian English (for example "colour", "optimise", and "practise" as the
  verb), no emojis, no images in messages, no em dashes, no exclamation marks, no hype.
  Feedback names what is right before what is wrong. Numbers group their digits in threes
  (500,050), in prose and in figures alike.
- Lessons never show an answer before it is asked for: anything that gives away a prediction or
  an exercise (later prose, a figure's caption, the names section) sits inside a `<Reveal>` for it.
- Visualisations are drawn for Derive only, from our own code. Never embed others' figures.
- The tutor gives hints, never solutions (see the plan's AI tutor section).
- Compute: always the lowest total cost option; B200, B300 and H200 are never used.
- Never commit secrets or email addresses. The Anthropic key lives only in Supabase, as a secret
  of the `derive-api` Edge Function.

## Stack

Next.js 16 (App Router, Turbopack, static export), React 19, TypeScript 6, Tailwind CSS 4
(CSS-first tokens in `src/app/globals.css`), Radix primitives, KaTeX, CodeMirror 6, Pyodide 314
(Python 3.14) self-hosted under `public/pyodide/`, ts-fsrs, Supabase (Postgres, auth and
row-level security), the Claude API (Opus 5.5 tutor, Haiku 5.5 guard). Next.js here differs
from older versions: read the guide in `node_modules/next/dist/docs/` before using an API you
have not used in this repository.

Hosting (Arnav, 6 November: GitHub, GitHub Actions and GitHub Pages; never Vercel). GitHub
Actions (`.github/workflows/publish.yml`) builds on every push to `main` and publishes:

- The site, a static export, to GitHub Pages at https://arnav-raja.github.io/Derive/. Each page
  is a shell (`src/app/`) that asks Derive's server for its content once it loads.
- Derive's server to the Supabase Edge Function `derive-api` (Mumbai), with every lesson packed
  in. It renders the pages' server components (`src/server/app/`, laid out like a Next.js app
  directory) to a small wire format (`src/lib/wire/`), runs their server actions, and serves the
  tutor routes, so reference solutions, tutor notes and the Anthropic key never reach the
  browser. `scripts/build-api.ts` builds it; it replaces each `"use client"` module with
  references the browser loads from `src/generated/client-modules.ts`, and registers each
  `"use server"` export as an action.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs, then vendors Pyodide and the SymPy wheels into `public/pyodide/` |
| `npm run dev` | The site on port 3000 and Derive's server on 3101, both rebuilt on every change (needs `.env.local`, or `DERIVE_LOCAL_STORE=1`) |
| `npm run build` | Derive's local server (`.derive-build/server.mjs`), then the static site in `out/` |
| `npm run build:edge` | Also the Edge Function bundle, `supabase/functions/derive-api/bundle.js` (CI does this) |
| `npm start` | The built site and its server on port 3100, as GitHub Pages and Supabase serve them |
| `npm run check` | Builds the server (refreshing the client component list), then type check, lint, unit tests, graph rules and content checks |
| `npm run check:graph` | The plan's graph rules; `-- --fix` syncs links from lesson.yaml into curriculum.json |
| `npm run check:exercises` | Runs every reference solution (must pass) and wrong solution (must fail) |
| `npm run test:e2e` | Builds the site and the server, then opens every page and lesson phase at phone, tablet and desktop widths in both themes, checking layout, figures and accessibility (axe), and holds each page to its performance budget; screenshots are kept in `test-results/e2e/` and the report in `playwright-report/` |

Local mode (`DERIVE_LOCAL_STORE=1`) skips sign-in and keeps learner data in `.derive-local/`.
It is for development and tests only and refuses to run in the deployed Edge Function.

## Layout

| Path | Holds |
| --- | --- |
| `src/app/` | The static shells GitHub Pages serves, one per page, and the root layout |
| `src/server/app/(app)/` | Signed-in pages: Today, Curriculum, courses, Review, Notebook, Progress, Settings, Placement, lesson overviews |
| `src/server/app/(workspace)/` | The full-screen lesson workspace, one phase at a time |
| `src/server/app/(auth)/` | The sign-in page (signing in itself runs in the browser, `src/lib/auth-client.ts`) |
| `src/server/` | Derive's server: the handler, routes (`routes.ts`, a page added under `app/` is listed there too), the renderer, the tutor's API routes, the Edge Function and local entry points |
| `src/lib/wire/` | The wire format, and the browser's host that fetches pages and calls actions (`client.tsx`) |
| `src/lib/actions.ts` | The server actions client components call by name |
| `src/components/` | UI parts (`ui/`), the shell, lessons, exercises, the code workbench, figures, the tutor |
| `src/lib/store/` | The `Store` interface, `SupabaseStore` (production) and `FileStore` (local) |
| `src/lib/curriculum/` | The compiled curriculum graph and the graph rules |
| `src/lib/content/` | Lesson file schemas and loaders |
| `content/curriculum/curriculum.json` | All 332 lessons, 34 courses and 9 capstones with their links |
| `content/lessons/<code>/` | One lesson: lesson.yaml, six phase MDX files, exercises, tutor notes, references |
| `supabase/migrations/` | Every database change, applied in order |
| `supabase/functions/derive-api/` | The Edge Function's entry; its bundle is built, not committed |
| `e2e/` | End-to-end tests: every page and lesson phase, the test learners and their stores, the performance budgets |

## Conventions

- Colours, type sizes, radii and shadows come only from the tokens in `globals.css`; Tailwind's
  default palette is switched off. Theme with tokens, never `dark:` variants. Spacing stays on
  the 4 px grid. State colours are always paired with a word or icon.
- All database access goes through a `Store`, on the server, under row-level security as the
  signed-in learner. The browser talks to Supabase only to sign in (Supabase Auth keeps the
  session in the browser); it sends the session to Derive's server with every call.
- Server components stay server components: pages and their parts under `src/server/app/` may
  use only what React allows on a server (no state or effects); anything interactive is a
  `"use client"` component. `next/navigation`'s `redirect` and `notFound`, and `next/cache`'s
  `revalidatePath` and `refresh`, work in pages and actions as before. A client component calls
  a server action through `src/lib/actions.ts`, and refreshes the page with `refreshPage()`
  from `src/lib/wire/client.tsx` rather than `router.refresh()`.
- Reference solutions and tutor notes are private: they are read only on the server and never
  shipped to the browser.
- Every database change is a new file in `supabase/migrations/`, applied with the Supabase tools,
  and the generated types in `src/lib/supabase/database.types.ts` are refreshed after it.
- Commits end with the attribution lines the session gives; push to `main` after checks pass.
