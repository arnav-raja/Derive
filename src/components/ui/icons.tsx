import type { SVGProps } from "react";

/*
 * Derive's own small icon set: simple strokes on a 16 unit grid, drawn for
 * Derive. Decorative by default; pass a title when an icon stands alone.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5l3.2 3L13 4.5" />
    </Icon>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.25V11M8 5v.01" />
    </Icon>
  );
}

export function HintIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 12.5h4M6.5 14.5h3" />
      <path d="M8 1.75a4.25 4.25 0 0 0-2.5 7.7c.4.3.75.9.75 1.55h3.5c0-.65.35-1.25.75-1.55A4.25 4.25 0 0 0 8 1.75z" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2l6.25 11H1.75z" />
      <path d="M8 6.5v3M8 11.5v.01" />
    </Icon>
  );
}

export function StateIcon({
  tone,
  ...props
}: IconProps & { tone: "info" | "correct" | "incorrect" | "hint" | "warning" }) {
  switch (tone) {
    case "correct":
      return <CheckIcon {...props} />;
    case "incorrect":
      return <CrossIcon {...props} />;
    case "hint":
      return <HintIcon {...props} />;
    case "warning":
      return <WarningIcon {...props} />;
    default:
      return <InfoIcon {...props} />;
  }
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 8H3M7 4L3 8l4 4" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6l4 4 4-4" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.25" y="7" width="9.5" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </Icon>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.5" />
    </Icon>
  );
}

export function HalfCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function FilledCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.5" fill="currentColor" />
    </Icon>
  );
}

/* Navigation glyphs for the phone tab bar. */

export function TodayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.25" y="3" width="11.5" height="10.75" rx="1.5" />
      <path d="M2.25 6.5h11.5M5.5 1.75v2.5M10.5 1.75v2.5" />
    </Icon>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="3.5" cy="4" r="1.5" />
      <circle cx="12.5" cy="4" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
      <path d="M4.75 4.9l2.4 5.6M11.25 4.9l-2.4 5.6M5 4h6" />
    </Icon>
  );
}

export function ReviewIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.25 8A5.25 5.25 0 1 1 11.7 4.3" />
      <path d="M13.25 2.25v2.5h-2.5" />
    </Icon>
  );
}

export function NotebookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="1.75" width="10" height="12.5" rx="1.5" />
      <path d="M6 5h4.5M6 8h4.5M6 11h2.5" />
    </Icon>
  );
}

export function ProgressIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 13.5h11" />
      <path d="M4.5 13.5V9M8 13.5V5.5M11.5 13.5V2.5" />
    </Icon>
  );
}
