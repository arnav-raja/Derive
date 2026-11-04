"use client";

import { clsx } from "clsx";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { CrossIcon, HintIcon } from "@/components/ui/icons";
import { Meter } from "@/components/ui/page";

/*
 * The tutor beside the lesson: the right-hand column on wide screens, a
 * bottom sheet on phones. Each exercise registers itself so the tutor can
 * send the learner's current work with a hint request.
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
  isOpen: boolean;
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

function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 1024px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
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
  const [spend, setSpend] = useState(budget);
  // A stable, mutable map: exercises add and remove themselves.
  const [registry] = useState(() => new Map<string, Registered>());
  const [, bump] = useState(0);

  const register = useCallback((info: Registered) => {
    registry.set(info.key, info);
    bump((n) => n + 1);
    return () => {
      registry.delete(info.key);
    };
  }, [registry]);

  const value = useMemo<TutorState>(
    () => ({
      lessonCode,
      phaseTitle,
      activeKey,
      isOpen,
      openFor: (key) => {
        setActiveKey(key);
        setOpen(true);
      },
      close: () => setOpen(false),
      register,
      budget: spend,
      configured,
    }),
    [lessonCode, phaseTitle, activeKey, isOpen, register, spend, configured],
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

export async function post(url: string, body: unknown): Promise<Reply> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as Reply;
  } catch {
    return { ok: false, error: "The tutor could not be reached. Check your connection and try again." };
  }
}

const RUNG_TOTAL = 5;

export function Conversation({ entries }: { entries: TutorEntry[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [entries.length]);
  if (entries.length === 0) return null;
  return (
    <ol className="flex flex-col gap-3" aria-live="polite">
      {entries.map((e, i) => (
        <li
          key={i}
          className={clsx(
            "rounded-md px-3 py-2 text-sm",
            e.role === "tutor" ? "border border-hint/40 bg-hint-soft text-ink" : "ml-6 bg-inset text-ink",
          )}
        >
          {e.role === "tutor" && e.rungName ? (
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-hint">
              <HintIcon className="size-3.5" />
              {e.rung ? `Rung ${e.rung} of ${RUNG_TOTAL}: ` : ""}
              {e.rungName}
            </p>
          ) : null}
          {e.role === "learner" ? <p className="sr-only">You said:</p> : null}
          <div className="tutor-text [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: e.html }} />
          {e.note ? <p className="mt-2 text-xs text-ink-muted">{e.note}</p> : null}
        </li>
      ))}
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

function PanelBody() {
  const tutor = useTutor();
  const registry = useContext(RegistryContext);
  const setSpend = useContext(SpendContext);
  const router = useRouter();
  // Replies shown before the page's own record catches up. A hint is saved on
  // the server and comes back in the exercise's log after a refresh, so its
  // local copy is hidden once the log has grown past where it was sent.
  const [extra, setExtra] = useState<Record<string, { entry: TutorEntry; until: number | null }[]>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!tutor || !registry || !setSpend) return null;

  const key = tutor.activeKey;
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
      reply = await post("/api/tutor/hint", {
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
      reply = await post("/api/tutor/talk", { mode: "discuss", lesson: tutor.lessonCode, exercise: ex.exerciseId, message: text, history });
    } else {
      if (!text) {
        setPending(false);
        return;
      }
      reply = await post("/api/tutor/talk", { mode: "ask", lesson: tutor.lessonCode, message: text, history });
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
    if (isHint) router.refresh();
  }

  const exhausted = Boolean(ex?.hints && !discussing && ladderLeft <= 0);
  const canAsk = tutor.configured || Boolean(ex?.hints && !discussing);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Tutor</p>
        <p className="text-base font-semibold text-ink">
          {ex ? ex.title : `About this phase: ${tutor.phaseTitle}`}
        </p>
        <p className="text-sm text-ink-muted">
          {ex?.hints && !discussing
            ? exhausted
              ? "All five rungs are used. There is no sixth: keep at it, or move on and it comes back later."
              : `Hints climb one rung at a time, and never give the answer. Next: rung ${nextRung} of ${RUNG_TOTAL}.`
            : discussing
              ? "You solved this one, so you can compare approaches or ask what it connects to."
              : "Ask about anything in the text. Exercises keep their answers; their hint buttons climb the ladder."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Conversation entries={entries} />
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
            void send();
          }}
        >
          <label className="sr-only" htmlFor="tutor-message">
            Your message to the tutor
          </label>
          <textarea
            id="tutor-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={3000}
            placeholder={
              ex?.hints && !discussing
                ? "Optional: say where you are stuck"
                : "Your question"
            }
            className={clsx(inputClasses, "resize-y py-2")}
            disabled={pending || exhausted}
          />
          <div className="flex items-center justify-between gap-3">
            <Button type="submit" disabled={pending || exhausted || (!(ex?.hints && !discussing) && !message.trim())}>
              {pending ? "Thinking" : ex?.hints && !discussing ? `Get hint ${nextRung} of ${RUNG_TOTAL}` : "Ask"}
            </Button>
            {tutor.configured ? (
              <div className="flex w-28 flex-col gap-1">
                <Meter
                  value={tutor.budget.spentUsd}
                  max={tutor.budget.limitUsd}
                  label="Today's tutor budget used"
                  tone={tutor.budget.spentUsd >= tutor.budget.limitUsd ? "warning" : "accent"}
                />
                <p className="tabular text-right text-xs text-ink-muted">
                  ${tutor.budget.spentUsd.toFixed(2)} of ${tutor.budget.limitUsd.toFixed(2)} today
                </p>
              </div>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">The tutor is not connected yet, so only the lesson&apos;s own hints are available.</p>
      )}
    </div>
  );
}

/** The tutor column on wide screens, and a bottom sheet on phones. */
export function TutorPanel() {
  const tutor = useTutor();
  const wide = useWide();
  if (!tutor) return null;
  if (wide) {
    return (
      <aside aria-label="Tutor" className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col rounded-lg border border-rule bg-surface p-4">
        <PanelBody />
      </aside>
    );
  }
  return (
    <Dialog.Root open={tutor.isOpen} onOpenChange={(o) => (o ? tutor.openFor(tutor.activeKey) : tutor.close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-lg border-t border-rule bg-surface p-4 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-ink">Tutor</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close the tutor">
                <CrossIcon className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1">
            <PanelBody />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Opens the tutor about the phase, for a button in the phase header on phones. */
export function AskTutorButton() {
  const tutor = useTutor();
  const wide = useWide();
  if (!tutor || wide) return null;
  return (
    <Button variant="secondary" size="sm" onClick={() => tutor.openFor(null)}>
      <HintIcon className="size-4" />
      Ask the tutor
    </Button>
  );
}
