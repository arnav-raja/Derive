import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseArt, CourseMark } from "@/components/course/course-art";
import { MAP_KEY, MapSquare } from "@/components/course/lesson-map";
import { CourseStateBadge, StatusBadge, StatusMark } from "@/components/course/status";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, BookIcon, ChevronRightIcon, ClockIcon, FlagIcon, LayersIcon } from "@/components/ui/icons";
import { Page, Panel } from "@/components/ui/page";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { getStore } from "@/lib/auth";
import { course as courseMeta } from "@/lib/curriculum/data";
import { SUBJECT_STYLE } from "@/lib/design/subject";
import { STATUS_WORDS, capstonesNeeding, courseSummaries, type CatalogueLesson, type CourseSummary } from "@/lib/learning/catalogue";
import { placementCourses } from "@/lib/learning/placement";
import { overview } from "@/lib/learning/service";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const meta = courseMeta(code);
  return { title: meta ? `${code} ${meta.title}` : "Course" };
}

function nextWord(c: CourseSummary): string | null {
  if (!c.next) return null;
  if (c.next.status === "in-progress") return "Continue";
  if (c.next.status === "available" || c.next.status === "skipped") return "Start";
  return null;
}

export default async function CoursePage({ params }: Props) {
  const { code } = await params;
  if (!courseMeta(code)) notFound();

  const store = await getStore();
  const ov = await overview(store);
  const courses = courseSummaries(ov);
  const c = courses.find((x) => x.code === code)!;
  const style = SUBJECT_STYLE[c.curriculum];
  const share = c.counts.total ? Math.round((100 * c.counts.done) / c.counts.total) : 0;
  const capstones = capstonesNeeding(code);
  const word = nextWord(c);
  const learner = ov.learner;
  const placement = placementCourses().includes(code);
  const titleOf = (k: string) => courses.find((x) => x.code === k)?.title ?? k;

  const unmet = (l: CatalogueLesson) =>
    l.requires.filter((r) => /^[MLE]/.test(r) && ov.status.get(r) !== "mastered" && ov.status.get(r) !== "skipped");

  return (
    <Page>
      <Breadcrumbs
        className="mb-6"
        items={[{ href: "/curriculum", label: "Curriculum" }, { href: "/curriculum", label: c.curriculumName }, { label: c.code }]}
      />

      <section className="overflow-hidden rounded-xl border border-rule bg-surface shadow-sm">
        <div className="grid md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", style.soft, style.text)}>
                {c.curriculumName}
              </span>
              {c.stage ? (
                <Badge tone="neutral">
                  Stage {c.stage}: {c.stageTitle}
                </Badge>
              ) : null}
              <CourseStateBadge state={c.state} />
            </div>
            <div className="flex flex-col gap-2">
              <p className={clsx("tabular text-sm font-semibold", style.text)}>{c.code}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">{c.title}</h1>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
              <li className="flex items-center gap-2">
                <BookIcon className="size-4 text-ink-faint" />
                <span>
                  <span className="tabular font-semibold text-ink">{c.counts.total}</span> lessons
                </span>
              </li>
              {c.hours ? (
                <li className="flex items-center gap-2">
                  <ClockIcon className="size-4 text-ink-faint" />
                  <span>
                    about <span className="tabular font-semibold text-ink">{c.hours}</span> hours
                  </span>
                </li>
              ) : null}
              <li className="flex items-center gap-2">
                <LayersIcon className="size-4 text-ink-faint" />
                <span>
                  <span className="tabular font-semibold text-ink">{c.counts.written}</span> written so far
                </span>
              </li>
            </ul>
            <div className="flex max-w-lg flex-col gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-muted">
                  <span className="tabular font-semibold text-ink">{c.counts.done}</span> of{" "}
                  <span className="tabular">{c.counts.total}</span> lessons done
                </span>
                <span className="tabular font-semibold text-ink">{share}%</span>
              </div>
              <ProgressBar
                value={c.counts.done}
                secondary={c.counts.inProgress}
                max={c.counts.total}
                tone={style.tone}
                label={`${c.code}: ${c.counts.done} of ${c.counts.total} lessons done`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {word && c.next ? (
                <Button asChild size="lg">
                  <Link href={`/lessons/${c.next.code}`}>
                    {word} {c.next.code}
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              ) : null}
              {placement ? (
                <Button asChild variant="secondary" size="lg">
                  <Link href={`/placement?course=${code}`}>{learner.placement?.[code] ? "See your placement" : "Skip what you know"}</Link>
                </Button>
              ) : null}
              {!word ? (
                <p className="text-sm text-ink-muted">
                  {c.state === "completed"
                    ? "Every lesson is done. Reviews keep it fresh."
                    : c.state === "coming-soon"
                      ? "Its lessons are being written."
                      : "It opens once the lessons it builds on are mastered."}
                </p>
              ) : null}
            </div>
          </div>
          <div className="relative hidden border-l border-rule md:block">
            <CourseArt code={c.code} className="absolute inset-0" />
          </div>
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-w-0 flex-col gap-4" aria-labelledby="lessons-heading">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="lessons-heading" className="text-lg font-semibold tracking-tight text-ink">
                Lessons
              </h2>
              <p className="text-sm text-ink-muted">Each lesson runs in six phases, from a puzzle to your own explanation.</p>
            </div>
          </div>
          <ol className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface shadow-xs">
            {c.lessons.map((l, i) => {
              const isNext = c.next?.code === l.code && word !== null;
              const needs = l.status === "locked" ? unmet(l) : [];
              const body = (
                <>
                  <span className="tabular hidden w-6 shrink-0 text-right text-sm font-medium text-ink-faint sm:block">{i + 1}</span>
                  <StatusMark status={l.status} />
                  <span className="tabular w-11 shrink-0 text-xs font-semibold text-ink-muted">{l.code}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p
                      className={clsx(
                        "text-sm font-medium",
                        l.status === "unwritten" ? "text-ink-muted" : "text-ink group-hover:text-accent",
                      )}
                    >
                      {l.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {l.minutes ? `About ${l.minutes} minutes` : "Being written"}
                      {needs.length ? ` · Opens after ${needs.join(", ")}` : null}
                    </p>
                  </div>
                  {isNext ? (
                    <span className="hidden sm:block">
                      <Badge tone="accent">{word === "Continue" ? "Continue here" : "Up next"}</Badge>
                    </span>
                  ) : (
                    <span className="hidden sm:block">
                      <StatusBadge status={l.status} />
                    </span>
                  )}
                  <span className="sr-only sm:hidden">, {STATUS_WORDS[l.status]}</span>
                </>
              );
              return (
                <li key={l.code} className={clsx(isNext && "bg-accent-soft/40")}>
                  {l.status === "unwritten" ? (
                    <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
                      {body}
                      <span className="size-4 shrink-0" />
                    </div>
                  ) : (
                    <Link
                      href={`/lessons/${l.code}`}
                      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-inset/70 sm:gap-4 sm:px-5"
                    >
                      {body}
                      <ChevronRightIcon className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-muted" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="flex flex-col gap-4">
          <Panel padding="sm" className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <ProgressRing value={c.counts.done} max={c.counts.total} size={64} stroke={6} tone={style.tone} label={`${share}% of ${c.code} done`}>
                <span className="tabular text-sm font-semibold text-ink">{share}%</span>
              </ProgressRing>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-ink">Your progress</p>
                <p className="text-sm text-ink-muted">
                  <span className="tabular">{c.counts.mastered}</span> mastered, <span className="tabular">{c.counts.done - c.counts.mastered}</span>{" "}
                  completed
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-2 border-t border-rule pt-4 text-sm">
              {MAP_KEY.map((s) => {
                const count = c.lessons.filter((l) => l.status === s || (s === "available" && l.status === "skipped")).length;
                return (
                  <li key={s} className="flex items-center gap-2.5">
                    <MapSquare status={s} className="size-3" />
                    <span className="flex-1 text-ink-muted">{STATUS_WORDS[s]}</span>
                    <span className="tabular font-medium text-ink">{count}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <CourseList title="Builds on" empty="Nothing: this is a starting point." codes={c.before} titleOf={titleOf} />
          <CourseList title="Leads to" empty="The end of this line of study." codes={c.after} titleOf={titleOf} />

          {capstones.length ? (
            <Panel padding="sm" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-ink">Capstones that use it</h2>
              <ul className="flex flex-col gap-2.5">
                {capstones.map((cap) => (
                  <li key={cap.code} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                      <FlagIcon className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="tabular text-xs font-semibold text-ink-muted">Capstone {cap.code.slice(1)}</span>
                      <span className="text-sm text-ink">{cap.title}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </Page>
  );
}

function CourseList({ title, empty, codes, titleOf }: { title: string; empty: string; codes: string[]; titleOf: (c: string) => string }) {
  return (
    <Panel padding="sm" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {codes.length ? (
        <ul className="flex flex-col gap-1">
          {codes.map((k) => (
            <li key={k}>
              <Link href={`/courses/${k}`} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-inset">
                <CourseMark code={k} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-accent">{titleOf(k)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{empty}</p>
      )}
    </Panel>
  );
}
