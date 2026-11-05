import { clsx } from "clsx";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CheckIcon, FlagIcon, LockIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/progress";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";

/*
 * A capstone: a project that proves one or more of the ten destination
 * skills. It opens once every lesson it requires is mastered; until then the
 * card says how many of them are.
 */

export type CapstoneSummary = {
  code: string;
  title: string;
  description: string;
  /** The courses it follows, as the plan lists them. */
  after: string[];
  gpuBudget: string;
  skills: number[];
  met: number;
  total: number;
};

export function CapstoneCard({ capstone }: { capstone: CapstoneSummary }) {
  const ready = capstone.total > 0 && capstone.met === capstone.total;
  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-rule bg-surface p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
          <FlagIcon className="size-5" />
        </span>
        {ready ? (
          <Badge tone="correct" icon={<CheckIcon className="size-3" strokeWidth={2.25} />}>
            Prerequisites met
          </Badge>
        ) : (
          <Badge tone="neutral" icon={<LockIcon className="size-3" />}>
            Locked
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="tabular text-xs font-semibold text-ink-muted">Capstone {capstone.code.slice(1)}</p>
        <h3 className="text-base leading-snug font-semibold text-ink">{capstone.title}</h3>
        <p className="text-sm text-ink-muted">{capstone.description}.</p>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
        <dt className="font-medium text-ink-muted">After</dt>
        <dd className="flex flex-wrap gap-1">
          {capstone.after.map((c) =>
            /^[MLE]\d+$/.test(c) ? (
              <Link
                key={c}
                href={`/courses/${c}`}
                className={clsx(
                  "tabular rounded-xs px-1 font-semibold transition-opacity hover:opacity-80",
                  SUBJECT_STYLE[subjectOf(c)].soft,
                  SUBJECT_STYLE[subjectOf(c)].text,
                )}
              >
                {c}
              </Link>
            ) : (
              <span key={c} className="text-ink">
                {c}
              </span>
            ),
          )}
        </dd>
        <dt className="font-medium text-ink-muted">Compute</dt>
        <dd className="text-ink">{capstone.gpuBudget}</dd>
        <dt className="font-medium text-ink-muted">Proves</dt>
        <dd className="tabular text-ink">
          {capstone.skills.length === 1 ? "Skill" : "Skills"} {capstone.skills.join(" and ")}
        </dd>
      </dl>
      <div className="mt-auto flex flex-col gap-1.5 pt-1">
        <ProgressBar
          value={capstone.met}
          max={capstone.total}
          size="sm"
          tone={ready ? "correct" : "accent"}
          label={`${capstone.code}: ${capstone.met} of ${capstone.total} prerequisites met`}
        />
        <p className="tabular text-xs text-ink-muted">
          {capstone.met} of {capstone.total} prerequisites met
        </p>
      </div>
    </article>
  );
}
