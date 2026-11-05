import { clsx } from "clsx";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CheckIcon, CircleIcon, HalfCircleIcon, LockIcon } from "@/components/ui/icons";
import { COURSE_STATE_WORDS, STATUS_WORDS, type CourseState, type DisplayStatus } from "@/lib/learning/catalogue";

/*
 * How a lesson's or a course's state is drawn: an icon and its word, never
 * colour alone. Shared by the catalogue, course pages and the lesson map.
 */

export function StatusMark({ status, className }: { status: DisplayStatus; className?: string }) {
  const cls = clsx("shrink-0", className ?? "size-5");
  switch (status) {
    case "mastered":
      return (
        <span className={clsx(cls, "flex items-center justify-center rounded-full bg-correct text-surface")}>
          <CheckIcon className="size-3/4" strokeWidth={2.25} />
        </span>
      );
    case "completed":
      return (
        <span className={clsx(cls, "flex items-center justify-center rounded-full border-2 border-correct text-correct")}>
          <CheckIcon className="size-3/4" strokeWidth={2.25} />
        </span>
      );
    case "in-progress":
      return <HalfCircleIcon className={clsx(cls, "text-accent")} />;
    case "available":
    case "skipped":
      return <CircleIcon className={clsx(cls, "text-accent")} strokeWidth={2} />;
    case "locked":
      return <LockIcon className={clsx(cls, "text-ink-faint")} />;
    default:
      return <CircleIcon className={clsx(cls, "text-rule-strong")} strokeDasharray="2.5 2" />;
  }
}

const STATUS_TONE: Record<DisplayStatus, BadgeTone> = {
  mastered: "correct",
  completed: "correct",
  "in-progress": "accent",
  available: "outline",
  skipped: "hint",
  locked: "neutral",
  unwritten: "neutral",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_WORDS[status]}</Badge>;
}

const COURSE_TONE: Record<CourseState, BadgeTone> = {
  "in-progress": "accent",
  completed: "correct",
  ready: "outline",
  locked: "neutral",
  "coming-soon": "neutral",
};

export function CourseStateBadge({ state, className }: { state: CourseState; className?: string }) {
  return (
    <Badge tone={COURSE_TONE[state]} className={className} icon={state === "locked" ? <LockIcon className="size-3" /> : undefined}>
      {COURSE_STATE_WORDS[state]}
    </Badge>
  );
}
