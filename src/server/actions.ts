/*
 * Every module of server actions, loaded when the server starts so that each
 * action is registered under its id before the browser calls it. A new
 * actions file is added here.
 */

import "./app/(auth)/actions";
import "./app/(app)/lessons/actions";
import "./app/(app)/notebook/actions";
import "./app/(app)/placement/actions";
import "./app/(app)/review/actions";
import "./app/(app)/settings/actions";
