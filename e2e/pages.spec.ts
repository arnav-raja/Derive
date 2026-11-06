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
  // A course and a lesson not yet written, and a capstone.
  "/courses/M2",
  "/lessons/M2.1",
  "/lessons/X1",
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

  test("a page that does not exist", async ({ page, errors }, testInfo) => {
    await checkPage(page, testInfo, "/no-such-page", { status: 404 });
    // The browser reports the 404 itself; that is the page working.
    const own = errors.filter((e) => !/status of 404/.test(e));
    errors.splice(0, errors.length, ...own);
  });
});
