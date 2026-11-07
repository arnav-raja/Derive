import { currentRequest } from "@/server/context";

/*
 * next/cache on Derive's server. Nothing is cached between requests, so
 * refreshing or revalidating means one thing: send the page again with the
 * action's answer.
 */

export function refresh(): void {
  currentRequest().refresh = true;
}

export function revalidatePath(): void {
  currentRequest().refresh = true;
}

export function revalidateTag(): void {
  currentRequest().refresh = true;
}
