import { clsx } from "clsx";

import type { WeekRecall } from "@/lib/learning/activity";

/*
 * Recall on reviews, week by week, against the floor below which new
 * lessons pause. Each bar carries its share in words underneath, and a week
 * under the floor is named as such in the legend, not by colour alone.
 */

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

export function RecallChart({ weeks, floor }: { weeks: WeekRecall[]; floor: number }) {
  const pct = (w: WeekRecall) => (w.total ? Math.round((w.correct / w.total) * 100) : null);
  const floorPct = Math.round(floor * 100);
  const empty = weeks.every((w) => w.total === 0);
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative h-36">
        {empty ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
            <div className="flex flex-col items-center gap-1 rounded-md bg-surface px-3 py-2 text-center">
              <p className="text-sm font-semibold text-ink">No reviews yet</p>
              <p className="text-xs text-ink-muted">They begin a few days after your first lesson.</p>
            </div>
          </div>
        ) : null}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 border-t border-rule" />
        <ol className="relative flex h-full items-end gap-2">
          {weeks.map((w) => {
            const p = pct(w);
            return (
              <li key={w.start} className="flex h-full flex-1 items-end">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "w-full rounded-t-xs",
                    p === null ? "h-0.5 bg-rule-strong" : p >= floorPct ? "bg-accent" : "bg-warning",
                  )}
                  style={p === null ? undefined : { height: `${Math.max(2, p)}%` }}
                />
                <span className="sr-only">
                  Week of {shortDate.format(asDate(w.start))}: {p === null ? "no reviews" : `${w.correct} of ${w.total} recalled, ${p}%`}
                  {p !== null && p < floorPct ? ", below the floor" : ""}.
                </span>
              </li>
            );
          })}
        </ol>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 z-[1] border-t-2 border-dashed border-ink-muted"
          style={{ bottom: `${floor * 100}%` }}
        />
      </div>
      <div aria-hidden="true" className={clsx("flex gap-2", empty && "hidden")}>
        {weeks.map((w) => {
          const p = pct(w);
          return (
            <span
              key={w.start}
              className={clsx("tabular flex-1 text-center text-xs font-medium", p !== null && p < floorPct ? "text-warning" : "text-ink-muted")}
            >
              {p === null ? "None" : `${p}%`}
            </span>
          );
        })}
      </div>
      <div aria-hidden="true" className="flex justify-between text-xs text-ink-muted">
        <span>Week of {shortDate.format(asDate(weeks[0]!.start))}</span>
        <span>This week</span>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-2 border-t border-rule pt-3 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-xs bg-accent" />
          At or above {floorPct}%
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-xs bg-warning" />
          Below {floorPct}%: new lessons pause
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="w-3 border-t-2 border-dashed border-ink-muted" />
          The {floorPct}% floor
        </span>
      </figcaption>
    </figure>
  );
}
