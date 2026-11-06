import { checkPage, test } from "./fixtures";
import { LEARNERS } from "./learners";
import { PHASES, writtenLessons } from "./store";

/*
 * Every phase of every written lesson, opened by a learner who has finished them all, so that
 * every Reveal is open and every figure is on the page. Each figure is screenshotted and checked
 * in both themes as well as the page around it.
 */

test.use({ baseURL: LEARNERS.finished.url });

for (const lesson of writtenLessons()) {
  test.describe(`${lesson.code} ${lesson.title}`, () => {
    test("overview", async ({ page }, testInfo) => {
      await checkPage(page, testInfo, `/lessons/${lesson.code}`);
    });
    for (const phase of PHASES) {
      test(phase, async ({ page }, testInfo) => {
        await checkPage(page, testInfo, `/lessons/${lesson.code}/${phase}`, { figures: true });
      });
    }
  });
}
