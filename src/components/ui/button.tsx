import { clsx } from "clsx";
import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent shadow-xs hover:bg-accent-strong active:translate-y-px disabled:bg-rule-strong disabled:text-ink-muted disabled:shadow-none",
  secondary:
    "border border-rule-strong bg-surface text-ink shadow-xs hover:border-ink-faint hover:bg-inset active:translate-y-px disabled:text-ink-faint disabled:shadow-none",
  soft: "bg-accent-soft text-accent hover:text-accent-strong active:translate-y-px disabled:bg-inset disabled:text-ink-faint",
  ghost: "text-ink-muted hover:bg-inset hover:text-ink disabled:text-ink-faint",
  danger:
    "border border-incorrect/60 bg-surface text-incorrect hover:bg-incorrect-soft disabled:border-rule-strong disabled:text-ink-faint",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-sm",
  md: "h-10 gap-2 rounded-md px-4 text-sm",
  lg: "h-12 gap-2 rounded-lg px-5 text-base",
  icon: "size-10 rounded-md",
  "icon-sm": "size-8 rounded-md",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return clsx(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:cursor-not-allowed",
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
