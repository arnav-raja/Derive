/*
 * Each curriculum has its own mark: a colour pair from the tokens, always
 * shown beside the curriculum's name or a course code, never alone. The
 * classes are written out in full so Tailwind can see them.
 */

export type Subject = "M" | "L" | "E";

export const SUBJECT_NAMES: Record<Subject, string> = {
  M: "Mathematics",
  L: "Machine learning",
  E: "ML engineering",
};

export const SUBJECT_STYLE: Record<
  Subject,
  { text: string; bg: string; soft: string; border: string; tone: "subject-m" | "subject-l" | "subject-e" }
> = {
  M: { text: "text-subject-m", bg: "bg-subject-m", soft: "bg-subject-m-soft", border: "border-subject-m", tone: "subject-m" },
  L: { text: "text-subject-l", bg: "bg-subject-l", soft: "bg-subject-l-soft", border: "border-subject-l", tone: "subject-l" },
  E: { text: "text-subject-e", bg: "bg-subject-e", soft: "bg-subject-e-soft", border: "border-subject-e", tone: "subject-e" },
};

/** The curriculum a course or lesson code belongs to: M1.4 and M1 are both Mathematics. */
export function subjectOf(code: string): Subject {
  const first = code.charAt(0);
  return first === "L" || first === "E" ? first : "M";
}
