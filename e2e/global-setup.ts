import { LEARNERS } from "./learners";
import { resetStore, seedFinishedStore } from "./store";

/** Gives each test server its learner, before the first test opens a page. */
export default function globalSetup() {
  resetStore(LEARNERS.new.dir);
  seedFinishedStore(LEARNERS.finished.dir);
}
