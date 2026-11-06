import { describe, expect, it } from "vitest";

import { loadLesson, writtenLessons } from "./lesson";
import { texToText } from "./plain-tex";
import { optionView } from "./views";

/*
 * Browsers give a control no name from KaTeX's maths, so every option whose label holds maths is
 * named by its label as plain text. That text must read as the label does, with no TeX left in
 * it, for every option of every written lesson and of every review variant.
 */

type Labelled = { where: string; id: string; label: string };

function optionsWithMaths(): Labelled[] {
  const out: Labelled[] = [];
  for (const code of writtenLessons()) {
    const lesson = loadLesson(code)!;
    for (const ex of lesson.exercises) {
      const answers = [{ where: `${code}/${ex.id}`, answer: ex.answer }];
      ex.review?.variants.forEach((v, i) => answers.push({ where: `${code}/${ex.id} variant ${i + 1}`, answer: v.answer }));
      for (const { where, answer } of answers) {
        if (answer.type !== "choice" && answer.type !== "breakit") continue;
        for (const o of answer.options) if (/\$[^$]+\$/.test(o.label)) out.push({ where, id: o.id, label: o.label });
      }
    }
  }
  return out;
}

/** Commands whose names are the words a reader says, such as log. */
const SAID_AS_WRITTEN = new Set(["log", "ln", "exp", "sin", "cos", "tan", "max", "min", "lim"]);

/** What is left of the TeX in one piece of maths once it is plain text, if anything. */
function leftOver(tex: string): string[] {
  const text = texToText(tex);
  const left = [...text.matchAll(/[\\{}$]/g)].map((m) => m[0]);
  for (const [, name] of tex.matchAll(/\\([a-zA-Z]+)/g)) {
    if (!SAID_AS_WRITTEN.has(name!) && name!.length > 1 && text.includes(name!)) left.push(name!);
  }
  return left;
}

describe("the names of options whose labels hold maths", () => {
  const options = optionsWithMaths();

  it("are found in the written lessons", () => {
    expect(options.length).toBeGreaterThan(0);
  });

  it("are plain text, with no TeX left in them", () => {
    const problems: string[] = [];
    for (const o of options) {
      const text = optionView(o.id, o.label).text;
      const left = [...o.label.matchAll(/\$([^$]+)\$/g)].flatMap((m) => leftOver(m[1]!));
      if (!text || left.length) problems.push(`${o.where} option ${o.id}: ${JSON.stringify(o.label)} is named ${JSON.stringify(text)}`);
    }
    expect(problems).toEqual([]);
  });

  it("are not given to options whose labels have no maths", () => {
    expect(optionView("plain", "A list of `int`, not a `str`").text).toBeUndefined();
  });

  it("leave out commands that only set size or spacing", () => {
    expect(texToText(String.raw`\displaystyle\sum_{k=0}^{3} (2k + 2)`)).toBe("Σₖ₌₀³ (2k + 2)");
    expect(leftOver(String.raw`\textstyle a \quad b`)).toEqual([]);
  });
});
