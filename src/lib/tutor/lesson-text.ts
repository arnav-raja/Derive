/*
 * Shared by the tutor and the content check, so it has no server-only import.
 */

/**
 * The lesson text the tutor may read: reveals and re-teaches are removed,
 * since they hold answers, and exercises become placeholders.
 */
export function tutorText(source: string): string {
  return source
    .replace(/<(Reveal|Reteach)\b[^>]*\/>/g, "")
    .replace(/<(Reveal|Reteach)\b[^>]*>[\s\S]*?<\/\1>/g, "")
    .replace(/<Exercise\s+id="([a-z0-9-]+)"[^>]*\/>/g, "[Exercise: $1]")
    .replace(/<MixedCheck\b[^>]*\/>/g, "[Mixed check]")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
