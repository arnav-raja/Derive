import "server-only";

import { z } from "zod";

import type { Exercise } from "@/lib/content/exercise-schema";
import type { LoadedLesson } from "@/lib/content/lesson";

import type { ModelClient } from "./anthropic";
import { GUARD_MODEL, NO_USAGE, TUTOR_MODEL, addUsage, costUsd, type TokenUsage } from "./config";
import { exerciseBlock, lessonContext, privateReference } from "./context";
import { guard, wordCount } from "./guard";
import { GRADER_SYSTEM } from "./prompts";

/*
 * Grading a written explanation or proof. A separate call from the tutor's:
 * it sees the model answer, at high effort, and returns a verdict for each
 * rubric criterion. Its feedback and its novice question pass the same guard
 * as hints, so the model answer is never handed over; if the guard blocks,
 * the feedback is rebuilt from the rubric alone.
 */

export type CriterionResult = { id: string; met: boolean; evidence: string };

export type Grading = {
  criteria: CriterionResult[];
  passed: boolean;
  feedback: string;
  question: string;
  source: "grader" | "rubric";
  blocked: number;
  graderUsage: TokenUsage;
  guardUsage: TokenUsage;
  costUsd: number;
};

const gradingSchema = z.object({
  criteria: z.array(z.object({ id: z.string(), met: z.boolean(), evidence: z.string() })),
  feedback: z.string(),
  question: z.string(),
});

const GRADING_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            met: { type: "boolean" },
            evidence: { type: "string" },
          },
          required: ["id", "met", "evidence"],
          additionalProperties: false,
        },
      },
      feedback: { type: "string" },
      question: { type: "string" },
    },
    required: ["criteria", "feedback", "question"],
    additionalProperties: false,
  },
};

function fenceText(body: string): string {
  return `<learner_text>\n${body.replace(/<\/?learner_text/gi, (m) => m.replace("<", "‹"))}\n</learner_text>`;
}

/** Feedback from the rubric alone, used when the grader's feedback is blocked. */
function rubricFeedback(ex: Exercise, criteria: CriterionResult[]): string {
  if (ex.answer.type !== "text") return "";
  const rubric = ex.answer.rubric;
  const label = (id: string) => rubric.find((r) => r.id === id)?.criterion ?? id;
  const met = criteria.filter((c) => c.met).map((c) => label(c.id));
  const unmet = criteria.filter((c) => !c.met).map((c) => label(c.id));
  const parts: string[] = [];
  if (met.length) parts.push(`You have shown: ${met.join("; ")}.`);
  if (unmet.length) parts.push(`Not yet shown: ${unmet.join("; ")}.`);
  return parts.join(" ");
}

function noviceQuestion(lesson: LoadedLesson, seed: number): string {
  const qs = lesson.tutor.novice;
  if (qs.length === 0) return "Could you say it again with a small, concrete example?";
  return qs[Math.abs(seed) % qs.length] ?? qs[0]!;
}

export async function gradeText(
  client: ModelClient,
  lesson: LoadedLesson,
  ex: Exercise,
  body: string,
): Promise<Grading | null> {
  if (ex.answer.type !== "text") return null;
  const rubric = ex.answer.rubric;
  let graderUsage = NO_USAGE;
  let guardUsage = NO_USAGE;

  let raw: z.infer<typeof gradingSchema>;
  try {
    const reply = await client.create({
      model: TUTOR_MODEL,
      max_tokens: 16000,
      system: [
        { type: "text", text: GRADER_SYSTEM },
        { type: "text", text: lessonContext(lesson), cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: [
            exerciseBlock(ex),
            "Rubric criteria, by id:",
            ...rubric.map((r) => `- ${r.id}: ${r.criterion}`),
            privateReference(ex),
            fenceText(body),
            "Grade the learner's text. Use the criterion ids above, one entry per criterion. Feedback at most 120 words; the question at most 40 words.",
          ].join("\n\n"),
        },
      ],
      output_config: { effort: "high", format: GRADING_FORMAT },
    });
    graderUsage = addUsage(graderUsage, reply.usage);
    if (reply.stopReason === "refusal") return null;
    const parsed = gradingSchema.safeParse(JSON.parse(reply.text));
    if (!parsed.success) return null;
    raw = parsed.data;
  } catch {
    return null;
  }

  // One verdict per criterion, in rubric order; a criterion the grader skipped is not met.
  const criteria: CriterionResult[] = rubric.map((r) => {
    const c = raw.criteria.find((x) => x.id === r.id);
    return { id: r.id, met: c?.met ?? false, evidence: (c?.evidence ?? "").slice(0, 400) };
  });
  const passed = criteria.every((c) => c.met);

  let feedback = raw.feedback.trim();
  let question = raw.question.trim();
  let source: Grading["source"] = "grader";
  let blocked = 0;
  const verdict = await guard(client, {
    kind: "feedback",
    protect: [ex],
    rung: null,
    learnerMessage: "",
    work: body,
    draft: `${feedback}\n\n${question}`,
    known: body,
    wordLimit: 200,
  });
  guardUsage = addUsage(guardUsage, verdict.usage);
  if (!verdict.pass || wordCount(feedback) > 160) {
    blocked = verdict.pass ? 0 : 1;
    feedback = rubricFeedback(ex, criteria);
    question = noviceQuestion(lesson, body.length);
    source = "rubric";
  }
  return {
    criteria,
    passed,
    feedback,
    question,
    source,
    blocked,
    graderUsage,
    guardUsage,
    costUsd: costUsd(TUTOR_MODEL, graderUsage) + costUsd(GUARD_MODEL, guardUsage),
  };
}
