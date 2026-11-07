import { serverAction } from "@/lib/wire/client";
import type * as Lessons from "@/server/app/(app)/lessons/actions";
import type * as Notebook from "@/server/app/(app)/notebook/actions";
import type * as Placement from "@/server/app/(app)/placement/actions";
import type * as Review from "@/server/app/(app)/review/actions";
import type * as Settings from "@/server/app/(app)/settings/actions";

/*
 * The server actions client components call directly. Each calls the action
 * of the same name on Derive's server, by the id the build gives it: the
 * module's path and the export's name. (Actions passed to a client component
 * as props arrive as references already, and need nothing here.)
 */

const LESSONS = "src/server/app/(app)/lessons/actions.ts";
const NOTEBOOK = "src/server/app/(app)/notebook/actions.ts";
const PLACEMENT = "src/server/app/(app)/placement/actions.ts";
const REVIEW = "src/server/app/(app)/review/actions.ts";
const SETTINGS = "src/server/app/(app)/settings/actions.ts";

export const answerExercise = serverAction<typeof Lessons.answerExercise>(`${LESSONS}#answerExercise`);
export const moveOn = serverAction<typeof Lessons.moveOn>(`${LESSONS}#moveOn`);
export const answerPlacement = serverAction<typeof Placement.answerPlacement>(`${PLACEMENT}#answerPlacement`);
export const answerReview = serverAction<typeof Review.answerReview>(`${REVIEW}#answerReview`);
export const answerCheck = serverAction<typeof Review.answerCheck>(`${REVIEW}#answerCheck`);
export const addNote = serverAction<typeof Notebook.addNote>(`${NOTEBOOK}#addNote`);
export const saveSettings = serverAction<typeof Settings.saveSettings>(`${SETTINGS}#saveSettings`);

/** Every id above, for the test that checks each names a real action. */
export const ACTION_IDS = [
  `${LESSONS}#answerExercise`,
  `${LESSONS}#moveOn`,
  `${PLACEMENT}#answerPlacement`,
  `${REVIEW}#answerReview`,
  `${REVIEW}#answerCheck`,
  `${NOTEBOOK}#addNote`,
  `${SETTINGS}#saveSettings`,
];
