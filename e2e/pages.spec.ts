import { checkPage, test } from "./fixtures";
import { LEARNERS, type TestLearner } from "./learners";

/*
 * Every page of the app, for a learner who has just signed up and for one who has finished every
 * written lesson, in both themes, at the window size of the project running it.
 */

const APP_PAGES = [
  "/today",
  "/curriculum",
  "/courses/M1",
  "/courses/E1",
  // A course and a lesson not yet written.
  "/courses/M2",
  "/lessons/M2.1",
  "/lessons/M1.1",
  "/review",
  "/notebook",
  "/progress",
  "/settings",
  "/placement",
  "/placement?course=M1",
  "/placement?course=E1",
];

function pagesFor(learner: TestLearner) {
  test.describe(`a ${learner.name} learner`, () => {
    test.use({ baseURL: learner.url });
    for (const path of APP_PAGES) {
      test(path, async ({ page }, testInfo) => {
        await checkPage(page, testInfo, path);
      });
    }
  });
}

pagesFor(LEARNERS.new);
pagesFor(LEARNERS.finished);

test.describe("pages outside the app", () => {
  test.use({ baseURL: LEARNERS.new.url });

  test("/sign-in", async ({ page }, testInfo) => {
    await checkPage(page, testInfo, "/sign-in");
  });

  test("/sign-in?mode=create", async ({ page }, testInfo) => {
    await checkPage(page, testInfo, "/sign-in?mode=create");
  });

  // A capstone has no page of its own yet; its address says so, as any unknown address does.
  // (Until the move to GitHub Pages the not-found page came with status 200, so this test used
  // to list /lessons/X1 among the pages that open.)
  for (const path of ["/no-such-page", "/lessons/X1"]) {
    test(`an address with no page: ${path}`, async ({ page, errors }, testInfo) => {
      await checkPage(page, testInfo, path, { status: 404 });
      // The browser reports the 404 itself; that is the page working.
      const own = errors.filter((e) => !/status of 404/.test(e));
      errors.splice(0, errors.length, ...own);
    });
  }
});
