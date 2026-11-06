import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";

import { StagePath, stageSummaries } from "@/components/course/stage-path";
import { ActivityCalendar, ActivityLegend } from "@/components/progress/activity-calendar";
import { RecallChart } from "@/components/progress/recall-chart";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, CheckCircleIcon, FlagIcon, ReviewIcon, TargetIcon, TodayIcon } from "@/components/ui/icons";
import { Page, PageHeader, Panel, PanelHeader, Section, StatStrip } from "@/components/ui/page";
import { ProgressBar } from "@/components/ui/progress";
import { getStore } from "@/lib/auth";
import { CURRICULUM_NAMES, curriculum, type CurriculumCode } from "@/lib/curriculum/data";
import { SUBJECT_STYLE } from "@/lib/design/subject";
import { activityStart, summariseActivity } from "@/lib/learning/activity";
import { courseSummaries } from "@/lib/learning/catalogue";
import { RECALL_FLOOR } from "@/lib/learning/governor";
import { TIME_ZONE, overview } from "@/lib/learning/service";

export const metadata: Metadata = { title: "Progress" };

/** Weeks of activity drawn in the calendar. */
const WEEKS = 20;

/** Digits grouped in threes (500,050), as everywhere in Derive. */
const n = (x: number) => x.toLocaleString("en-GB");
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

/** Every lesson a node depends on, following hard prerequisites all the way down. */
function closure(start: string[], requires: (code: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...start];
  while (stack.length) {
    const code = stack.pop()!;
    if (seen.has(code)) continue;
    seen.add(code);
    stack.push(...requires(code));
  }
  return seen;
}

const SHARES = [
  { key: "mastered", label: "Mastered", swatch: "bg-correct" },
  { key: "finished", label: "Finished, not yet mastered", swatch: "bg-accent" },
  { key: "underWay", label: "Under way", swatch: "bg-accent/35" },
  { key: "rest", label: "Not begun", swatch: "bg-inset" },
] as const;

type Shares = Record<(typeof SHARES)[number]["key"], number>;

/** A curriculum's lessons split into mastered, finished, under way and not begun. */
function SharesBar({ shares, total, label }: { shares: Shares; total: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-inset">
      {SHARES.filter((s) => s.key !== "rest").map((s) =>
        shares[s.key] > 0 ? (
          <span key={s.key} className={clsx("h-full", s.swatch)} style={{ width: `${(shares[s.key] / Math.max(1, total)) * 100}%` }} />
        ) : null,
      )}
    </div>
  );
}

export default async function ProgressPage() {
  const store = await getStore();
  const now = new Date();
  const [ov, points] = await Promise.all([overview(store, now), store.activity(activityStart(now, WEEKS, TIME_ZONE))]);
  const activity = summariseActivity(points, now, WEEKS, { timeZone: TIME_ZONE });
  const data = curriculum();
  const courses = courseSummaries(ov);

  const concepts = [...ov.concepts.values()];
  const mastered = concepts.filter((c) => c.masteredAt).length;
  const provisional = concepts.filter((c) => c.provisional && !c.masteredAt).length;

  const sum = (list: typeof courses, f: (c: (typeof courses)[number]) => number) => list.reduce((a, c) => a + f(c), 0);
  const lessons = sum(courses, (c) => c.counts.total);
  const finished = sum(courses, (c) => c.counts.done);

  const lastFour = activity.recall.slice(-4);
  const reviewed = lastFour.reduce((a, w) => a + w.total, 0);
  const recalled = lastFour.reduce((a, w) => a + w.correct, 0);

  const byCurriculum = (Object.keys(CURRICULUM_NAMES) as CurriculumCode[]).map((code) => {
    const list = courses.filter((c) => c.curriculum === code);
    const total = sum(list, (c) => c.counts.total);
    const m = sum(list, (c) => c.counts.mastered);
    const done = sum(list, (c) => c.counts.done);
    const underWay = sum(list, (c) => c.counts.inProgress);
    const shares: Shares = { mastered: m, finished: done - m, underWay, rest: Math.max(0, total - done - underWay) };
    return { code, name: CURRICULUM_NAMES[code], total, shares, courses: list.length };
  });

  const requiresOf = (code: string) =>
    data.lessons[code]?.requires ?? data.capstones.find((c) => c.code === code)?.requires ?? [];
  const skills = data.skills.map((skill, i) => {
    const capstones = data.capstones.filter((c) => c.skills.includes(i + 1));
    const needed = [...closure(capstones.map((c) => c.code), requiresOf)].filter((c) => data.lessons[c]);
    return { skill, capstones, total: needed.length, mastered: needed.filter((c) => ov.status.get(c) === "mastered").length };
  });

  const hours = data.stages.reduce((a, s) => a + s.hours, 0);
  const months = Math.round(hours / Math.max(1, ov.learner.weeklyHours) / 4.345);

  return (
    <Page>
      <PageHeader
        eyebrow="Your progress"
        title="Progress"
        description="Progress means demonstrated mastery: an idea you produced yourself, explained simply and recalled later. Time spent does not count."
        actions={
          <Link href="/review" className={buttonClasses("secondary")}>
            <ReviewIcon className="size-4" />
            {ov.dueNow.length ? `${plural(ov.dueNow.length, "review", "reviews")} due` : "Review"}
          </Link>
        }
      />

      <div className="flex flex-col gap-10">
        <StatStrip
          items={[
            {
              label: "Concepts mastered",
              value: n(mastered),
              icon: <CheckCircleIcon />,
              detail: provisional ? `${n(provisional)} more placed, awaiting confirmation` : "Produced, explained and recalled",
            },
            { label: "Lessons finished", value: n(finished), icon: <FlagIcon />, detail: `of ${n(lessons)} in the curriculum` },
            {
              label: "Recall, last 4 weeks",
              value: reviewed ? `${Math.round((recalled / reviewed) * 100)}%` : "None yet",
              icon: <TargetIcon />,
              detail: reviewed ? `${n(recalled)} of ${plural(reviewed, "review", "reviews")} answered well` : "Reviews begin a few days after a lesson",
            },
            {
              label: "Days with practice",
              value: n(activity.activeDays),
              icon: <TodayIcon />,
              detail: `in the last ${WEEKS} weeks`,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Panel className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="text-base font-semibold text-ink">Activity</h3>
                <p className="text-sm text-ink-muted">
                  {plural(activity.answers, "answer", "answers")} on {plural(activity.activeDays, "day", "days")} in the last {WEEKS} weeks.
                </p>
              </div>
              <dl className="flex shrink-0 gap-5 sm:text-right">
                <div>
                  <dt className="text-xs text-ink-muted">Current run</dt>
                  <dd className="tabular text-sm font-semibold text-ink">{plural(activity.currentRun, "day", "days")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Longest run</dt>
                  <dd className="tabular text-sm font-semibold text-ink">{plural(activity.longestRun, "day", "days")}</dd>
                </div>
              </dl>
            </div>
            <ActivityCalendar
              weeks={activity.weeks}
              label={`Practice over the last ${WEEKS} weeks: ${plural(activity.activeDays, "day", "days")} with answers, the current run ${plural(activity.currentRun, "day", "days")}.`}
            />
            <ActivityLegend className="justify-end" />
          </Panel>

          <Panel className="flex flex-col gap-5">
            <PanelHeader
              title="Recall by week"
              description={`${plural(ov.cards.length, "idea", "ideas")} in rotation, ${n(ov.dueNow.length)} due now.`}
            />
            <RecallChart weeks={activity.recall} floor={RECALL_FLOOR} />
          </Panel>
        </div>

        <Section title="Mastery by curriculum" description="Each lesson counts once its ideas come back correctly in spaced review.">
          <Panel className="flex flex-col gap-6">
            <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Key">
              {SHARES.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-xs text-ink-muted">
                  <span aria-hidden="true" className={clsx("size-3 rounded-xs", s.swatch, s.key === "rest" && "border border-rule-strong")} />
                  {s.label}
                </li>
              ))}
            </ul>
            <ol className="flex flex-col gap-6">
              {byCurriculum.map((c) => {
                const style = SUBJECT_STYLE[c.code];
                return (
                  <li key={c.code} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className={clsx("tabular rounded-xs px-1.5 py-0.5 text-xs font-semibold", style.soft, style.text)}>{c.code}</span>
                        {c.name}
                        <span className="font-normal text-ink-muted">· {plural(c.courses, "course", "courses")}</span>
                      </p>
                      <p className="tabular text-sm text-ink-muted">
                        <span className="font-semibold text-ink">{n(c.shares.mastered)}</span> mastered · {n(c.shares.mastered + c.shares.finished)} finished ·{" "}
                        {n(c.shares.underWay)} under way · {plural(c.total, "lesson", "lessons")}
                      </p>
                    </div>
                    <SharesBar
                      shares={c.shares}
                      total={c.total}
                      label={`${c.name}: ${n(c.shares.mastered)} mastered, ${n(c.shares.finished)} more finished, ${n(c.shares.underWay)} under way, of ${plural(c.total, "lesson", "lessons")}.`}
                    />
                  </li>
                );
              })}
            </ol>
          </Panel>
        </Section>

        <Section title="Frontier-lab skills" description="The ten destination skills. Every lesson in the graph leads to at least one, and a capstone proves each.">
          <Panel padding="none" className="overflow-hidden">
            <ol className="divide-y divide-rule">
              {skills.map((s, i) => (
                <li key={s.skill} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_14rem] sm:items-center sm:px-6">
                  <span className="tabular flex size-8 items-center justify-center rounded-md bg-inset text-sm font-semibold text-ink-muted">{i + 1}</span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm font-semibold text-ink">{s.skill}</p>
                    <p className="text-xs text-ink-muted">
                      Proved in{" "}
                      {s.capstones.length
                        ? s.capstones.map((c, j) => (
                            <span key={c.code}>
                              {j > 0 ? "; " : ""}
                              <span className="tabular font-semibold">{c.code}</span> {c.title}
                            </span>
                          ))
                        : "the lessons"}
                      .
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                    <ProgressBar value={s.mastered} max={Math.max(1, s.total)} size="sm" tone="correct" label={`Lessons mastered towards skill ${i + 1}`} />
                    <span className="tabular shrink-0 text-xs text-ink-muted">
                      {n(s.mastered)} of {n(s.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </Section>

        <Section
          title="Stages"
          description={`Five stages, about ${n(hours)} hours: roughly ${plural(months, "month", "months")} at your ${n(ov.learner.weeklyHours)} hours a week.`}
          action={
            <Link href="/curriculum" className={clsx(buttonClasses("ghost", "sm"), "text-accent")}>
              Open the curriculum
              <ArrowRightIcon className="size-4" />
            </Link>
          }
        >
          <StagePath stages={stageSummaries(data.stages, courses)} />
        </Section>
      </div>
    </Page>
  );
}
