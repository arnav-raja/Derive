import { clsx } from "clsx";

import { activityLevel, type ActivityDay } from "@/lib/learning/activity";

/*
 * Days with practice, one square a day: weeks run left to right, Monday at
 * the top. The squares darken with the number of answers given that day.
 * The picture is summed up in words for assistive technology and beside it.
 */

const LEVELS = ["bg-inset", "bg-accent/25", "bg-accent/50", "bg-accent/75", "bg-accent"] as const;
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""] as const;

const monthName = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

/** A month's name sits over the first week that starts in it, unless the next name would crowd it. */
function monthLabels(weeks: ActivityDay[][]): string[] {
  const labels = weeks.map((w, i) => {
    const m = w[0]!.date.slice(0, 7);
    return i === 0 || m !== weeks[i - 1]![0]!.date.slice(0, 7) ? monthName.format(asDate(w[0]!.date)) : "";
  });
  const next = labels.findIndex((l, i) => i > 0 && l);
  if (next > 0 && next < 3) labels[0] = "";
  return labels;
}

export function ActivityLegend({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center gap-2 text-xs text-ink-muted", className)} aria-hidden="true">
      <span>Fewer</span>
      <span className="flex gap-1">
        {LEVELS.map((c) => (
          <span key={c} className={clsx("size-3 rounded-xs", c)} />
        ))}
      </span>
      <span>More answers</span>
    </div>
  );
}

export function ActivityCalendar({ weeks, label }: { weeks: ActivityDay[][]; label: string }) {
  const columns = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };
  const months = monthLabels(weeks);
  return (
    <div role="img" aria-label={label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
      <span />
      <div className="grid gap-1" style={columns}>
        {months.map((m, i) => (
          <span key={i} className="overflow-visible text-xs whitespace-nowrap text-ink-muted">
            {m}
          </span>
        ))}
      </div>
      <div className="grid grid-rows-7 gap-1">
        {DAY_LABELS.map((d, i) => (
          <span key={i} className="flex items-center text-xs leading-none text-ink-muted">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" style={columns}>
        {weeks.flat().map((d) => (
          <span
            key={d.date}
            title={d.future ? undefined : `${d.count === 0 ? "No" : d.count.toLocaleString("en-GB")} ${d.count === 1 ? "answer" : "answers"} on ${dayName.format(asDate(d.date))}`}
            className={clsx("aspect-square rounded-xs", d.future ? "bg-transparent" : LEVELS[activityLevel(d.count)])}
          />
        ))}
      </div>
    </div>
  );
}
