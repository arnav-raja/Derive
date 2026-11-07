/*
 * The API routes: JSON in and out, called by the browser through apiFetch.
 * Each module exports GET or POST handlers, as Next.js route handlers do.
 */

type RouteModule = {
  GET?: (request: Request) => Promise<Response> | Response;
  POST?: (request: Request) => Promise<Response> | Response;
};

export const API_ROUTES: Record<string, () => Promise<RouteModule>> = {
  health: () => import("./api/health/route"),
  "tutor/hint": () => import("./api/tutor/hint/route"),
  "tutor/talk": () => import("./api/tutor/talk/route"),
  "tutor/grade": () => import("./api/tutor/grade/route"),
};
