"use client";

import { clsx } from "clsx";
import { Dialog } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CrossIcon, HintIcon, PanelRightIcon, SendIcon, SparkIcon } from "@/components/ui/icons";
import { apiFetch, type ApiRoute } from "@/lib/api-client";
import { refreshPage } from "@/lib/wire/client";
import { useMedia, usePreference } from "@/lib/use-preference";

/*
 * The tutor beside the lesson: a column docked on the right on wide screens,
 * a sheet from the bottom on phones. Each exercise registers itself so the
 * tutor can send the learner's current work with a hint request. Hints
 * climb a ladder of five rungs and never give the answer.
 */

export type TutorEntry = {
  role: "learner" | "tutor";
  html: string;
  rung?: number | null;
  rungName?: string | null;
  source?: "tutor" | "notes";
  note?: string | null;
};

export type TutorExercise = {
  key: string;
  exerciseId: string;
  title: string;
  hints: boolean;
  solved: boolean;
  /** Hints so far, oldest first. */
  log: TutorEntry[];
  ladderLeft: number;
};

type Registered = TutorExercise & { getWork: () => string | null };

type TutorState = {
  lessonCode: string;
  phaseTitle: string;
  activeKey: string | null;
  /** The phone sheet. */
  isOpen: boolean;
  /** The column on wide screens. */
  docked: boolean;
  setDocked: (docked: boolean) => void;
  openFor: (key: string | null) => void;
  close: () => void;
  register: (info: Registered) => () => void;
  budget: { spentUsd: number; limitUsd: number };
  configured: boolean;
};

const TutorContext = createContext<TutorState | null>(null);

export function useTutor(): TutorState | null {
  return useContext(TutorContext);
}

const WIDE = "(min-width: 1024px)";

/** Wide enough for the tutor's column; the server assumes so. */
export function useWide(): boolean {
  return useMedia(WIDE, true);
}

export function TutorProvider({
  lessonCode,
  phaseTitle,
  budget,
  configured,
  children,
}: {
  lessonCode: string;
  phaseTitle: string;
  budget: { spentUsd: number; limitUsd: number };
  configured: boolean;
  children: ReactNode;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isOpen, setOpen] = useState(false);
  // Whether the column is shown is remembered in this browser.
  const [docked, setDocked] = usePreference("derive:tutor-docked", true);
  const [spend, setSpend] = useState(budget);
  // A stable, mutable map: exercises add and remove themselves.
  const [registry] = useState(() => new Map<string, Registered>());
  const [, bump] = useState(0);

  const register = useCallback(
    (info: Registered) => {
      registry.set(info.key, info);
      bump((n) => n + 1);
      return () => {
        registry.delete(info.key);
      };
    },
    [registry],
  );

  const value = useMemo<TutorState>(
    () => ({
      lessonCode,
      phaseTitle,
      activeKey,
      isOpen,
      docked,
      setDocked,
      openFor: (key) => {
        setActiveKey(key);
        if (window.matchMedia(WIDE).matches) setDocked(true);
        else setOpen(true);
      },
      close: () => setOpen(false),
      register,
      budget: spend,
      configured,
    }),
    [lessonCode, phaseTitle, activeKey, isOpen, docked, setDocked, register, spend, configured],
  );

  return (
    <TutorContext.Provider value={value}>
      <SpendContext.Provider value={setSpend}>
        <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
      </SpendContext.Provider>
    </TutorContext.Provider>
  );
}

const RegistryContext = createContext<Map<string, Registered> | null>(null);
const SpendContext = createContext<((b: { spentUsd: number; limitUsd: number }) => void) | null>(null);

export type Reply =
  | {
      ok: true;
      html: string;
      source: "tutor" | "notes";
      rung: number | null;
      rungName: string | null;
      ladderLeft: number | null;
      note: string | null;
      budget: { spentUsd: number; limitUsd: number };
    }
  | { ok: false; error: string };

export async function post(route: ApiRoute, body: unknown): Promise<Reply> {
  try {
    const res = await apiFetch(route, body);
    return (await res.json()) as Reply;
  } catch {
    return { ok: false, error: "The tutor could not be reached. Check your connection and try again." };
  }
}

const RUNG_TOTAL = 5;

function TutorAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-hint-soft text-hint",
        size === "sm" ? "size-6 [&>svg]:size-3.5" : "size-8 [&>svg]:size-4",
      )}
    >
      <SparkIcon />
    </span>
  );
}

/** The thread of messages, the tutor on the left and the learner on the right. */
export function Conversation({ entries }: { entries: TutorEntry[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [entries.length]);
  if (entries.length === 0) return null;
  return (
    <ol className="flex flex-col gap-4" aria-live="polite">
      {entries.map((e, i) =>
        e.role === "tutor" ? (
          <li key={i} className="flex items-start gap-2.5">
            <TutorAvatar size="sm" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {e.rungName ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-hint">
                  <HintIcon className="size-3.5" />
                  {e.rung ? `Rung ${e.rung} of ${RUNG_TOTAL}: ` : ""}
                  {e.rungName}
                </p>
              ) : (
                <p className="text-xs font-semibold text-ink-muted">Tutor</p>
              )}
              <div className="tutor-text rounded-lg rounded-tl-xs border border-rule bg-surface px-3 py-2 text-sm leading-relaxed text-ink shadow-xs [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
                <div dangerouslySetInnerHTML={{ __html: e.html }} />
                {e.note ? <p className="mt-2 border-t border-rule pt-2 text-xs text-ink-muted">{e.note}</p> : null}
              </div>
            </div>
          </li>
        ) : (
          <li key={i} className="flex justify-end pl-8">
            <p className="sr-only">You said:</p>
            <div className="rounded-lg rounded-tr-xs bg-accent-soft px-3 py-2 text-sm leading-relaxed text-ink [&_p+p]:mt-2">
              <div dangerouslySetInnerHTML={{ __html: e.html }} />
            </div>
          </li>
        ),
      )}
      <div ref={end} />
    </ol>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function asLearnerHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Five rungs, filled as hints are used. */
function Ladder({ used }: { used: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`${used} of ${RUNG_TOTAL} hints used`}>
      {Array.from({ length: RUNG_TOTAL }, (_, i) => (
        <span key={i} className={clsx("h-1.5 w-4 rounded-full", i < used ? "bg-hint" : "bg-rule-strong")} />
      ))}
    </span>
  );
}

/**
 * One conversation: about an exercise (hints, or a discussion once it is
 * solved) or about the phase as a whole. `forKey` pins it to one exercise,
 * as in the full-screen code editor; otherwise it follows the exercise whose
 * hint button was pressed last.
 */
export function TutorThread({ forKey, scroll = false }: { forKey?: string; scroll?: boolean }) {
  const tutor = useTutor();
  const registry = useContext(RegistryContext);
  const setSpend = useContext(SpendContext);
  // Replies shown before the page's own record catches up. A hint is saved on
  // the server and comes back in the exercise's log after a refresh, so its
  // local copy is hidden once the log has grown past where it was sent.
  const [extra, setExtra] = useState<Record<string, { entry: TutorEntry; until: number | null }[]>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!tutor || !registry || !setSpend) return null;

  const key = forKey ?? tutor.activeKey;
  const ex = key ? registry.get(key) : undefined;
  const threadKey = key ?? "__phase";
  const logLength = ex?.log.length ?? 0;
  const local = (extra[threadKey] ?? []).filter((x) => x.until === null || logLength <= x.until).map((x) => x.entry);
  const entries = [...(ex?.log ?? []), ...local];
  const discussing = Boolean(ex?.solved);
  const ladderLeft = ex
    ? Math.min(
        ex.ladderLeft,
        ...local.filter((e) => e.role === "tutor" && e.rung).map((e) => RUNG_TOTAL - (e.rung ?? 0)),
      )
    : 0;
  const nextRung = RUNG_TOTAL - ladderLeft + 1;
  const hinting = Boolean(ex?.hints && !discussing);

  const add = (entry: TutorEntry, until: number | null) =>
    setExtra((prev) => ({ ...prev, [threadKey]: [...(prev[threadKey] ?? []), { entry, until }] }));

  async function send() {
    if (!tutor || !setSpend) return;
    setPending(true);
    setError(null);
    const text = message.trim();
    const history = entries.map((e) => ({
      role: e.role,
      text: e.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    }));
    let reply: Reply;
    if (ex && ex.hints && !discussing) {
      reply = await post("tutor/hint", {
        lesson: tutor.lessonCode,
        exercise: ex.exerciseId,
        message: text,
        work: ex.getWork(),
      });
    } else if (ex && discussing) {
      if (!text) {
        setPending(false);
        return;
      }
      reply = await post("tutor/talk", { mode: "discuss", lesson: tutor.lessonCode, exercise: ex.exerciseId, message: text, history });
    } else {
      if (!text) {
        setPending(false);
        return;
      }
      reply = await post("tutor/talk", { mode: "ask", lesson: tutor.lessonCode, message: text, history });
    }
    setPending(false);
    if (!reply.ok) {
      setError(reply.error);
      return;
    }
    const isHint = Boolean(ex?.hints && !discussing);
    const until = isHint ? logLength : null;
    if (text) add({ role: "learner", html: asLearnerHtml(text) }, until);
    add({ role: "tutor", html: reply.html, rung: reply.rung, rungName: reply.rungName, source: reply.source, note: reply.note }, until);
    setMessage("");
    setSpend(reply.budget);
    // A hint changes the exercise's record (hints used), so the page refreshes its state.
    if (isHint) void refreshPage();
  }

  const exhausted = Boolean(hinting && ladderLeft <= 0);
  const canAsk = tutor.configured || hinting;
  const canSend = !pending && !exhausted && (hinting || Boolean(message.trim()));

  return (
    <div className={clsx("flex min-h-0 flex-col gap-4", scroll && "h-full")}>
      <div className="flex flex-col gap-2 rounded-lg border border-rule bg-inset/50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">{ex ? ex.title : `About this phase: ${tutor.phaseTitle}`}</p>
          {hinting ? <Ladder used={RUNG_TOTAL - ladderLeft} /> : null}
        </div>
        <p className="text-xs leading-relaxed text-ink-muted">
          {hinting
            ? exhausted
              ? "All five rungs are used. There is no sixth: keep at it, or move on and it comes back later."
              : `Hints climb one rung at a time and never give the answer. Next: rung ${nextRung} of ${RUNG_TOTAL}.`
            : discussing
              ? "You solved this one, so you can compare approaches or ask what it connects to."
              : "Ask about anything in the text. Exercises keep their answers; their hint buttons climb the ladder."}
        </p>
      </div>

      <div className={clsx("min-h-0", scroll ? "flex-1 overflow-y-auto pr-1" : "max-h-96 overflow-y-auto")}>
        {entries.length ? (
          <Conversation entries={entries} />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <TutorAvatar />
            <p className="text-sm font-medium text-ink">{hinting ? "Stuck? Ask for the first rung." : "Nothing asked yet"}</p>
            <p className="max-w-64 text-xs text-ink-muted">
              {hinting
                ? "Say where you are stuck if you can. The tutor sees your work so far."
                : "The tutor knows this lesson and what you have already done in it."}
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-incorrect">
          {error}
        </p>
      ) : null}

      {canAsk ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) void send();
          }}
        >
          <label className="sr-only" htmlFor={`tutor-message-${forKey ?? "panel"}`}>
            Your message to the tutor
          </label>
          <div className="flex flex-col rounded-lg border border-rule-strong bg-surface shadow-xs transition-colors focus-within:border-accent">
            <textarea
              id={`tutor-message-${forKey ?? "panel"}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (canSend) void send();
                }
              }}
              rows={2}
              maxLength={3000}
              placeholder={hinting ? "Optional: say where you are stuck" : "Ask a question about this phase"}
              className="min-h-16 w-full resize-none rounded-t-lg bg-transparent px-3 pt-2.5 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none disabled:text-ink-muted"
              disabled={pending || exhausted}
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <span className="pl-1 text-xs text-ink-faint">Ctrl or Cmd with Enter sends</span>
              <Button type="submit" size="sm" disabled={!canSend}>
                {pending ? "Thinking" : hinting ? `Get hint ${nextRung} of ${RUNG_TOTAL}` : "Ask"}
                {pending ? null : <SendIcon className="size-3.5" />}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="rounded-lg bg-inset px-3 py-2 text-sm text-ink-muted">
          The tutor is not connected yet, so only the lesson&apos;s own hints are available.
        </p>
      )}
    </div>
  );
}

function TutorTitle({ as: Tag = "p" }: { as?: "p" | "h2" }) {
  return (
    <div className="flex items-center gap-2.5">
      <TutorAvatar />
      <div className="flex flex-col">
        <Tag className="text-sm font-semibold text-ink">Tutor</Tag>
        <p className="text-xs text-ink-muted">Hints, never answers</p>
      </div>
    </div>
  );
}

/** The docked column on wide screens. */
export function TutorDock() {
  const tutor = useTutor();
  if (!tutor) return null;
  return (
    <aside aria-label="Tutor" className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-rule px-4">
        <TutorTitle as="h2" />
        <Button variant="ghost" size="icon-sm" onClick={() => tutor.setDocked(false)} aria-label="Hide the tutor" title="Hide the tutor">
          <PanelRightIcon className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <TutorThread scroll />
      </div>
    </aside>
  );
}

/** The sheet on phones and narrow windows. */
export function TutorSheet() {
  const tutor = useTutor();
  const wide = useWide();
  if (!tutor || wide) return null;
  return (
    <Dialog.Root open={tutor.isOpen} onOpenChange={(o) => (o ? tutor.openFor(tutor.activeKey) : tutor.close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-xs" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-xl border-t border-rule bg-surface shadow-lg"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-rule-strong" aria-hidden="true" />
          <div className="flex items-center justify-between px-4 py-2">
            <Dialog.Title asChild>
              <div>
                <TutorTitle />
              </div>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close the tutor">
                <CrossIcon className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 px-4 pb-4">
            <TutorThread scroll />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The tutor button in the workspace's top bar: shows or hides the column, or opens the sheet. */
export function TutorToggle() {
  const tutor = useTutor();
  const wide = useWide();
  if (!tutor) return null;
  const on = wide && tutor.docked;
  return (
    <Button
      variant={on ? "soft" : "secondary"}
      size="sm"
      aria-pressed={wide ? on : undefined}
      onClick={() => (wide ? tutor.setDocked(!tutor.docked) : tutor.openFor(null))}
    >
      <SparkIcon className="size-4" />
      <span className="hidden sm:inline">Tutor</span>
      <span className="sr-only sm:hidden">Tutor</span>
    </Button>
  );
}
