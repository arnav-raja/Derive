import path from "node:path";

/*
 * The end-to-end tests run the production build in local mode, once for each learner below.
 * Each server keeps its learner's data in its own folder, so tests for different learners can
 * run side by side. The local store reads its file on every request, so a learner's data can be
 * written before the first test opens a page.
 */

const ROOT = path.join(import.meta.dirname, "..");
const STORES = path.join(ROOT, "test-results", "e2e-store");

export type LearnerName = "new" | "finished";

export type TestLearner = { name: LearnerName; port: number; dir: string; url: string };

function learner(name: LearnerName, port: number): TestLearner {
  return { name, port, dir: path.join(STORES, name), url: `http://127.0.0.1:${port}` };
}

export const LEARNERS: Record<LearnerName, TestLearner> = {
  /** Has just signed up: no answers and no progress. Nothing in the tests writes to this store. */
  new: learner("new", 3200),
  /** Has finished every written lesson, with reviews due. Opening a phase may add to this store. */
  finished: learner("finished", 3201),
};
