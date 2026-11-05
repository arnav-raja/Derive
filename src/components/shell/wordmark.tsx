import { clsx } from "clsx";

/**
 * Derive's mark: a curve, the tangent that touches it and the point where
 * they meet, on the accent colour. Drawn inline so it stays sharp and themed.
 */
export function Logomark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={clsx("shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path d="M6 24Q18 24 26 8" fill="none" strokeWidth="2.25" strokeLinecap="round" className="stroke-on-accent" opacity="0.55" />
      <path d="M9.5 26L24.5 14" fill="none" strokeWidth="2.25" strokeLinecap="round" className="stroke-on-accent" />
      <circle cx="17" cy="20" r="2.25" className="fill-on-accent" />
    </svg>
  );
}

/** The mark and the name together, as the app's signature. "inverse" is for the always-dark workbench panels. */
export function Wordmark({
  size = "md",
  tone = "default",
  className,
}: {
  size?: "md" | "lg";
  tone?: "default" | "inverse";
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <Logomark size={size === "lg" ? 36 : 28} />
      <span
        className={clsx(
          "font-semibold tracking-tight",
          tone === "inverse" ? "text-code-ink" : "text-ink",
          size === "lg" ? "text-2xl" : "text-lg",
        )}
      >
        Derive
      </span>
    </span>
  );
}
