import "server-only";

import { z } from "zod";

import type { Exercise } from "@/lib/content/exercise-schema";

import type { ModelClient } from "./anthropic";
import { GUARD_MODEL, NO_USAGE, type TokenUsage } from "./config";
import { exerciseBlock, privateReference, rungLabel } from "./context";
import { GUARD_FEEDBACK_SYSTEM, GUARD_SYSTEM, HINT_HARD_WORD_LIMIT } from "./prompts";

/*
 * The guard sees the hidden reference; the tutor does not. Every draft goes
 * through two checks before the learner sees it: a free, deterministic check
 * for the plainest leaks (reference code lines, the reference expression, a
 * number inside the accepted range, long passages of a model answer, code
 * blocks before the last rung), then Claude Haiku, which judges the rest.
 * The guard fails closed: if it cannot decide, the draft is blocked.
 */

export type GuardVerdict = { pass: boolean; reason: string; by: "static" | "model" | "error"; usage: TokenUsage };

/** Lower case, with all white space removed: how code and expressions are compared. */
function squash(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function wordCount(s: string): number {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Lines of reference code worth protecting: long enough to mean something, and not already public. */
function protectedCodeLines(reference: string, known: string): string[] {
  const knownSquashed = squash(known);
  const out: string[] = [];
  for (const raw of reference.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    const s = squash(line);
    if (s.length < 10) continue;
    if (knownSquashed.includes(s)) continue;
    out.push(s);
  }
  return out;
}

const NUMBER =
  /(?<![\w.])(?:[-−]?\d[\d,]*(?:\.\d+)?\s*(?:×|\\times|\*|x)\s*)?10\s*(?:\^|\*\*)\s*\{?\s*[-+−]?\d+\s*\}?|(?<![\w.])[-−]?\d[\d,]*(?:\.\d+)?(?:\s*[eE]\s*[-+−]?\d+)?/g;
const POWER = /^(?:(-?[\d,]*(?:\.\d+)?)\s*(?:×|\\times|\*|x)\s*)?10\s*(?:\^|\*\*)\s*\{?\s*([-+]?\d+)\s*\}?$/;

/** Every number written in a text, in the notations people use for them. */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(NUMBER)) {
    const raw = m[0].replace(/−/g, "-").trim();
    const power = POWER.exec(raw);
    const value = power
      ? Number(`${power[1] ? power[1].replace(/,/g, "") : "1"}e${power[2]}`)
      : Number(raw.replace(/,/g, "").replace(/\s+/g, ""));
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

function withinFactor(value: number, target: number, factor: number): boolean {
  if (target === 0) return Math.abs(value) < 1e-12;
  if (Math.sign(value) !== Math.sign(target)) return false;
  const r = value / target;
  return r >= 1 / factor && r <= factor;
}

function shingles(text: string, n: number): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

export type StaticContext = {
  /** The rung being given, or null outside the ladder. */
  rung: number | null;
  /** Everything the learner already has: the prompt, starter, tests, their own work and the lesson's notes. */
  known: string;
  /** Word limit for this reply. */
  wordLimit?: number;
};

/**
 * The free, deterministic part of the guard. Returns a reason when the draft
 * plainly leaks, or null when it leaves the decision to the model guard.
 */
export function staticCheck(draft: string, protect: Exercise[], ctx: StaticContext): string | null {
  const limit = ctx.wordLimit ?? HINT_HARD_WORD_LIMIT;
  if (wordCount(draft) > limit) return `The reply is longer than ${limit} words.`;

  const draftSquashed = squash(draft);
  const knownNumbers = new Set(numbersIn(ctx.known).map((n) => n.toPrecision(6)));
  const blocks = [...draft.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1] ?? "");
  if (ctx.rung !== null && ctx.rung < 5) {
    const longBlock = blocks.some((b) => b.split("\n").filter((l) => l.trim()).length >= 3);
    if (longBlock) return "The reply contains a block of code before the last rung.";
  }

  for (const ex of protect) {
    const a = ex.answer;
    switch (a.type) {
      case "code": {
        const lines = protectedCodeLines(a.reference, ctx.known);
        const hit = lines.filter((l) => draftSquashed.includes(l));
        if (hit.length > 0) return "The reply repeats a line of the reference solution.";
        break;
      }
      case "expression": {
        for (const form of [a.reference, ...a.accept]) {
          const s = squash(form).replace(/\*\*/g, "^");
          if (s.length < 5) continue;
          const d = draftSquashed.replace(/\*\*/g, "^");
          if (d.includes(s) && !squash(ctx.known).replace(/\*\*/g, "^").includes(s)) {
            return "The reply writes out the expression the step asks for.";
          }
        }
        break;
      }
      case "number": {
        const factor = "factor" in a.tolerance ? a.tolerance.factor : 1.01;
        const big = Math.abs(a.value) >= 20;
        for (const n of numbersIn(draft)) {
          if (knownNumbers.has(n.toPrecision(6))) continue;
          if (big && Number.isInteger(n) && Math.abs(n) < 10) continue;
          if (withinFactor(n, a.value, factor)) return "The reply gives a number inside the accepted range.";
        }
        break;
      }
      case "text": {
        const ref = shingles(a.reference, 7);
        const known = shingles(ctx.known, 7);
        let shared = 0;
        for (const s of shingles(draft, 7)) if (ref.has(s) && !known.has(s)) shared++;
        if (shared >= 2) return "The reply repeats passages of the model answer.";
        break;
      }
      default:
        break;
    }
  }
  return null;
}

const verdictSchema = z.object({ verdict: z.enum(["pass", "block"]), reason: z.string() });

const VERDICT_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["pass", "block"] },
      reason: { type: "string" },
    },
    required: ["verdict", "reason"],
    additionalProperties: false,
  },
};

export type GuardInput = {
  kind: "hint" | "feedback";
  /** The exercises whose answers must stay hidden. */
  protect: Exercise[];
  rung: number | null;
  learnerMessage: string;
  work: string | null;
  draft: string;
  known: string;
  wordLimit?: number;
};

function fence(tag: string, body: string): string {
  const safe = body.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);
  return `<${tag}>\n${safe}\n</${tag}>`;
}

/** A reason is shown to the tutor for its rewrite, so it must not carry the leak itself. */
function safeReason(reason: string, protect: Exercise[], rung: number | null): string {
  const r = reason.trim().slice(0, 400) || "The draft went beyond what this rung allows.";
  return staticCheck(r, protect, { rung, known: "", wordLimit: 400 }) === null &&
    numbersIn(r).length === 0
    ? r
    : "The draft revealed part of the answer.";
}

export async function guard(client: ModelClient | null, input: GuardInput): Promise<GuardVerdict> {
  const stat = staticCheck(input.draft, input.protect, {
    rung: input.rung,
    known: input.known,
    wordLimit: input.wordLimit,
  });
  if (stat) return { pass: false, reason: stat, by: "static", usage: NO_USAGE };
  if (input.protect.length === 0) return { pass: true, reason: "Nothing to protect.", by: "static", usage: NO_USAGE };
  if (!client) return { pass: false, reason: "The guard is not available.", by: "error", usage: NO_USAGE };

  const parts: string[] = [];
  for (const ex of input.protect) parts.push(exerciseBlock(ex), privateReference(ex));
  parts.push(
    input.kind === "hint" && input.rung !== null
      ? `The draft is meant to be ${rungLabel(input.rung)}.`
      : input.kind === "hint"
        ? "The draft answers a question outside the hint ladder; it may explain the lesson's ideas but must not solve the exercises above."
        : "The draft is feedback on the learner's written answer.",
  );
  if (input.learnerMessage.trim()) parts.push(fence("learner_message", input.learnerMessage));
  if (input.work?.trim()) parts.push(fence("learner_work", input.work));
  parts.push(fence("draft", input.draft));

  try {
    const reply = await client.create({
      model: GUARD_MODEL,
      max_tokens: 4000,
      system: input.kind === "hint" ? GUARD_SYSTEM : GUARD_FEEDBACK_SYSTEM,
      messages: [{ role: "user", content: parts.join("\n\n") }],
      output_config: { effort: "medium", format: VERDICT_FORMAT },
    });
    const parsed = verdictSchema.safeParse(JSON.parse(reply.text));
    if (!parsed.success) return { pass: false, reason: "The guard's answer could not be read.", by: "error", usage: reply.usage };
    return {
      pass: parsed.data.verdict === "pass",
      reason: parsed.data.verdict === "pass" ? parsed.data.reason : safeReason(parsed.data.reason, input.protect, input.rung),
      by: "model",
      usage: reply.usage,
    };
  } catch {
    return { pass: false, reason: "The guard could not be reached.", by: "error", usage: NO_USAGE };
  }
}
