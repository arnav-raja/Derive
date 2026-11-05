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

/* Shell, workspace and phase glyphs. */

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 7.25L8 2.75l5.5 4.5" />
      <path d="M4 6.25v7.25h8V6.25" />
      <path d="M6.75 13.5V10.25h2.5v3.25" />
    </Icon>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.25 3.5c1.9-.7 3.85-.55 5.75.75 1.9-1.3 3.85-1.45 5.75-.75v9.25c-1.9-.7-3.85-.55-5.75.75-1.9-1.3-3.85-1.45-5.75-.75z" />
      <path d="M8 4.25v9.25" />
    </Icon>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2l6 3.25L8 8.5 2 5.25z" />
      <path d="M2 8l6 3.25L14 8" />
      <path d="M2 10.75L8 14l6-3.25" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="6" cy="11.5" r="1.5" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.25 9.6A5.5 5.5 0 0 1 6.4 2.75a5.5 5.5 0 1 0 6.85 6.85z" />
    </Icon>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.75" y="2.5" width="12.5" height="8.5" rx="1.5" />
      <path d="M5.5 14h5M8 11v3" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 13.5H3.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1H6" />
      <path d="M10.5 11l3-3-3-3M13.5 8H6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 4l4 4-4 4" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4L6 8l4 4" />
    </Icon>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10l4-4 4 4" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5V8l2.25 1.5" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
    </Icon>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.75" y="2.5" width="12.5" height="11" rx="1.5" />
      <path d="M4.5 6.5l2 1.75-2 1.75M8 10.25h3.5" />
    </Icon>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />
    </Icon>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 1.75H4.5a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5.25z" />
      <path d="M9 1.75v3.5h3.5" />
    </Icon>
  );
}

export function PanelLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.75" y="2.5" width="12.5" height="11" rx="1.5" />
      <path d="M6 2.5v11" />
    </Icon>
  );
}

export function PanelRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.75" y="2.5" width="12.5" height="11" rx="1.5" />
      <path d="M10 2.5v11" />
    </Icon>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" />
    </Icon>
  );
}

export function CollapseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 6.5h-4v-4M2.5 9.5h4v4M9.5 6.5l4-4M6.5 9.5l-4 4" />
    </Icon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 13V3.5M4 7.25l4-4 4 4" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 14V2.5" />
      <path d="M3.5 3h8l-1.75 2.75L11.5 8.5h-8" />
    </Icon>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <circle cx="8" cy="8" r="3.25" />
      <circle cx="8" cy="8" r="0.6" fill="currentColor" />
    </Icon>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 8A5.25 5.25 0 1 0 4.3 4.3" />
      <path d="M2.75 2.25v2.5h2.5" />
    </Icon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.25 8.25l1.9 1.85L10.9 6" />
    </Icon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 11l6-6M6 5h5v5" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 13.75c.6-2.5 2.75-4 5.25-4s4.65 1.5 5.25 4" />
    </Icon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.25" y="2.25" width="4.75" height="4.75" rx="1" />
      <rect x="9" y="2.25" width="4.75" height="4.75" rx="1" />
      <rect x="2.25" y="9" width="4.75" height="4.75" rx="1" />
      <rect x="9" y="9" width="4.75" height="4.75" rx="1" />
    </Icon>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.25c3.3 0 5.75 2.2 5.75 5s-2.45 5-5.75 5c-.75 0-1.45-.1-2.1-.3L2.75 13.25l.9-2.6C2.8 9.8 2.25 8.6 2.25 7.25c0-2.8 2.45-5 5.75-5z" />
    </Icon>
  );
}

/* One glyph for each of the six phases. */

export function PuzzleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6.25 6.25a1.75 1.75 0 1 1 2.6 1.55c-.55.3-.85.75-.85 1.35v.35" />
      <path d="M8 11.5v.01" />
    </Icon>
  );
}

export function RecallIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 8A5.25 5.25 0 1 0 4.3 4.3" />
      <path d="M2.75 2.25v2.5h2.5" />
      <path d="M8 5.25V8l2 1.25" />
    </Icon>
  );
}

export function ExploreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M10.5 5.5L9 9l-3.5 1.5L7 7z" />
    </Icon>
  );
}

export function DeriveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.5 2.5l3 3L6 13H3v-3z" />
      <path d="M9 4l3 3" />
    </Icon>
  );
}

export function ExplainIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.25h11v7.5H7.25L4.25 13.25v-2.5H2.5z" />
      <path d="M5.25 6h5.5M5.25 8h3.5" />
    </Icon>
  );
}

/* Exercise kinds and the code workbench. */

export function BugIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.75" y="5" width="6.5" height="8.25" rx="3.25" />
      <path d="M6 3.25l1 1.5M10 3.25l-1 1.5M4.75 8.25H2.5M13.5 8.25h-2.25M4.9 11.25l-2 1.25M11.1 11.25l2 1.25M4.9 6l-1.9-1M11.1 6l1.9-1M8 7.5v5.5" />
    </Icon>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.25 2.25h3.5M6.75 2.25v4L3 12.5a.9.9 0 0 0 .8 1.25h8.4a.9.9 0 0 0 .8-1.25L9.25 6.25v-4" />
      <path d="M4.6 10h6.8" />
    </Icon>
  );
}

export function RulerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.9" y="5.25" width="12.2" height="5.5" rx="1" />
      <path d="M4.5 5.25v2M7 5.25v2.75M9.5 5.25v2M12 5.25v2.75" />
    </Icon>
  );
}

export function ProofIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.75 4h10.5M2.75 7h10.5M2.75 10h6" />
      <rect x="10.5" y="10" width="2.75" height="2.75" fill="currentColor" />
    </Icon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.75l1.4 3.6a2 2 0 0 0 1.25 1.25L14.25 8l-3.6 1.4a2 2 0 0 0-1.25 1.25L8 14.25l-1.4-3.6A2 2 0 0 0 5.35 9.4L1.75 8l3.6-1.4A2 2 0 0 0 6.6 5.35z" />
    </Icon>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.75" y="4" width="12.5" height="8" rx="1.5" />
      <path d="M4.25 6.5h.01M6.75 6.5h.01M9.25 6.5h.01M11.75 6.5h.01M5 9.5h6" />
    </Icon>
  );
}
