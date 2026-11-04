import { clsx } from "clsx";
import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-strong disabled:bg-rule-strong disabled:text-ink-muted",
  secondary:
    "border border-rule-strong bg-surface text-ink hover:border-ink-faint hover:bg-inset disabled:text-ink-faint",
  ghost: "text-ink-muted hover:bg-inset hover:text-ink disabled:text-ink-faint",
  danger:
    "border border-incorrect text-incorrect hover:bg-incorrect-soft disabled:border-rule-strong disabled:text-ink-faint",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return clsx(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap",
    "transition-colors duration-150 disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child element (for example a link) with button styles. */
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  type,
  ...props
}: ButtonProps) {
  const classes = clsx(buttonClasses(variant, size), className);
  if (asChild) {
    return <Slot.Root className={classes} {...props} />;
  }
  return <button type={type ?? "button"} className={classes} {...props} />;
}
