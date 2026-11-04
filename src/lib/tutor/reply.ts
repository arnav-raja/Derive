import "server-only";

import { RUNG_NAMES, type Exercise } from "@/lib/content/exercise-schema";
import type { LoadedLesson } from "@/lib/content/lesson";

import type { ModelClient, ModelRequest } from "./anthropic";
import { GUARD_MODEL, NO_USAGE, TUTOR_MODEL, addUsage, costUsd, type TokenUsage } from "./config";
import { exerciseBlock, lessonContext, rungLabel } from "./context";
import { guard } from "./guard";
import { ASK_SYSTEM, DISCUSS_SYSTEM, HINT_SYSTEM, SOCRATIC_SYSTEM } from "./prompts";

/*
 * One tutor reply: draft with Claude Opus, check with the guard, and if the
 * guard blocks, rewrite once a rung lower; if that is blocked too, fall back
 * to the lesson's authored text, which is leak-tested with the lesson.
 *
 * Each request is a single user turn that carries the conversation so far as
 * text, so no earlier model output is ever replayed, and the cached prefix
 * (instructions and lesson context) stays identical across a lesson.
 */

export type TutorMode = "hint" | "discuss" | "ask" | "socratic";

export type Turn = { role: "learner" | "tutor"; text: string };

export type TutorRequest = {
  mode: TutorMode;
  lesson: LoadedLesson;
  /** The exercise in focus, if any. */
  exercise: Exercise | null;
  /** The rung to give, in hint mode. */
  rung: number | null;
  message: string;
  work: string | null;
  diagnosis: string | null;
  /** Earlier hints or turns about this exercise, oldest first. */
  history: Turn[];
  /** The lesson's authored text for this rung, which the tutor adapts. */
  note: string | null;
  /** What the checkers' diagnoses usually mean for this exercise. */
  notes: string | null;
  /** Extra context for the mode, such as the review question in Socratic mode. */
  extra?: string;
  /** Exercises whose answers must stay hidden. */
  protect: Exercise[];
  /** Said when no safe reply can be written. */
  fallback: string;
  /** The rung the fallback text belongs to. */
  fallbackRung?: number | null;
};

export type TutorResult = {
  text: string;
  source: "tutor" | "notes";
  /** The rung actually given (lower than asked when a draft was blocked). */
  rung: number | null;
  blocked: number;
  /** Why the reply came from the notes instead of the tutor, if it did. */
  fellBack?: "blocked" | "refused" | "error" | "empty";
  tutorUsage: TokenUsage;
  guardUsage: TokenUsage;
  costUsd: number;
};

const SYSTEMS: Record<TutorMode, string> = {
  hint: HINT_SYSTEM,
  discuss: DISCUSS_SYSTEM,
  ask: ASK_SYSTEM,
  socratic: SOCRATIC_SYSTEM,
};

const TAGS = ["learner_message", "learner_work", "conversation", "diagnosis", "lesson_note", "exercise", "review"];

/** Learner text cannot close the tags it is wrapped in. */
function neutralise(text: string): string {
  let out = text;
  for (const tag of TAGS) out = out.replace(new RegExp(`</?${tag}`, "gi"), (m) => m.replace("<", "‹"));
  return out;
}

function fence(tag: string, body: string, attrs = ""): string {
  return `<${tag}${attrs}>\n${neutralise(body).trim()}\n</${tag}>`;
}

function instruction(req: TutorRequest, rung: number | null, blockedReason: string | null): string {
  const lines: string[] = [];
  if (blockedReason) {
    lines.push(
      `A previous draft of this reply was stopped before the learner saw it: ${blockedReason} ` +
        "Write a new reply that stays well inside the rules.",
    );
  }
  switch (req.mode) {
    case "hint":
      lines.push(
        `Give the hint for ${rungLabel(rung ?? 1)}.` +
          (req.message.trim() ? " Answer the learner's message within that rung." : ""),
      );
      break;
    case "discuss":
      lines.push("Reply to the learner's message about the exercise they have solved.");
      break;
    case "ask":
      lines.push("Answer the learner's question about the lesson.");
      break;
    case "socratic":
      lines.push(
        req.history.length === 0
          ? "Ask your first question."
          : "Reply to the learner's latest message in the conversation.",
      );
      break;
  }
  return lines.join("\n");
}

function userMessage(req: TutorRequest, rung: number | null, blockedReason: string | null): string {
  const parts: string[] = [];
  if (req.exercise) parts.push(exerciseBlock(req.exercise));
  if (req.extra) parts.push(fence("review", req.extra));
  if (req.diagnosis) parts.push(fence("diagnosis", req.diagnosis));
  if (req.work?.trim()) parts.push(fence("learner_work", req.work));
  if (req.history.length) {
    const lines = req.history.map((t) => `${t.role === "learner" ? "Learner" : "Tutor"}: ${t.text}`);
    parts.push(fence("conversation", lines.join("\n\n")));
  }
  if (req.mode === "hint" && rung !== null) {
    if (req.notes) parts.push(fence("lesson_note", req.notes, ' about="this exercise"'));
    if (req.note) parts.push(fence("lesson_note", req.note, ` rung="${rung}"`));
  }
  if (req.message.trim()) parts.push(fence("learner_message", req.message));
  parts.push(instruction(req, rung, blockedReason));
  return parts.join("\n\n");
}

export function buildRequest(req: TutorRequest, rung: number | null, blockedReason: string | null): ModelRequest {
  return {
    model: TUTOR_MODEL,
    max_tokens: 8000,
    system: [
      { type: "text", text: SYSTEMS[req.mode] },
      { type: "text", text: lessonContext(req.lesson), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage(req, rung, blockedReason) }],
    output_config: { effort: "medium" },
  };
}

/** Everything the learner already has, so the guard does not count it as a leak. */
function knownText(req: TutorRequest): string {
  const parts = [req.message, req.work ?? "", req.note ?? "", req.extra ?? ""];
  parts.push(...req.history.map((t) => t.text));
  if (req.exercise) {
    parts.push(req.exercise.prompt);
    const a = req.exercise.answer;
    if (a.type === "code") parts.push(a.starter, a.tests);
  }
  return parts.join("\n");
}

export async function tutorReply(client: ModelClient | null, req: TutorRequest): Promise<TutorResult> {
  let tutorUsage = NO_USAGE;
  let guardUsage = NO_USAGE;
  let blocked = 0;
  const finish = (r: Omit<TutorResult, "tutorUsage" | "guardUsage" | "costUsd" | "blocked">): TutorResult => ({
    ...r,
    blocked,
    tutorUsage,
    guardUsage,
    costUsd: costUsd(TUTOR_MODEL, tutorUsage) + costUsd(GUARD_MODEL, guardUsage),
  });
  const fallback = (why: TutorResult["fellBack"]) =>
    finish({ text: req.fallback, source: "notes", rung: req.fallbackRung ?? req.rung, fellBack: why });

  if (!client) return fallback("error");

  const known = knownText(req);
  let rung = req.rung;
  let reason: string | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      const reply = await client.create(buildRequest(req, rung, reason));
      tutorUsage = addUsage(tutorUsage, reply.usage);
      if (reply.stopReason === "refusal") return fallback("refused");
      text = reply.text;
      if (!text) return fallback("empty");
    } catch {
      return fallback("error");
    }
    const verdict = await guard(client, {
      kind: "hint",
      protect: req.protect,
      rung: req.mode === "hint" ? rung : null,
      learnerMessage: req.message,
      work: req.work,
      draft: text,
      known,
    });
    guardUsage = addUsage(guardUsage, verdict.usage);
    if (verdict.pass) return finish({ text, source: "tutor", rung });
    blocked++;
    reason = verdict.reason;
    // A blocked draft is rewritten one rung lower.
    if (req.mode === "hint" && rung !== null && rung > 1) rung -= 1;
  }
  return fallback("blocked");
}

export function rungName(rung: number): string {
  return RUNG_NAMES[rung - 1] ?? "Hint";
}
