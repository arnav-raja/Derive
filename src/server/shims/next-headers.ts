/*
 * next/headers on Derive's server. The learner's session arrives as a bearer
 * token, not a cookie, so nothing may read cookies here.
 */

export function cookies(): never {
  throw new Error("Derive's server has no cookies; the session comes from the Authorization header.");
}

export function headers(): never {
  throw new Error("Read request details from the server's request context instead.");
}
