import { clsx } from "clsx";

/**
 * Derive's wordmark: the name set in Source Serif with a small accent mark,
 * a stylised derivative prime. Text, not an image, so it stays sharp and themed.
 */
export function Wordmark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-baseline font-serif font-semibold tracking-tight text-ink",
        size === "lg" ? "text-3xl" : "text-xl",
        className,
      )}
    >
      Derive
      <span aria-hidden="true" className="ml-px text-accent">
        &prime;
      </span>
    </span>
  );
}
