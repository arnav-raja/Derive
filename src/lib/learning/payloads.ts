/*
 * What an answer attempt records, by answer type. The browser checks code,
 * break-it and expression answers and sends the result; the server checks
 * choices, numbers and steps itself. The tutor reads these to build its
 * diagnosis, so they hold what the checkers found, never the reference.
 */

export type PyErrorPayload = { type: string; message: string; line?: number | null };

export type TestPayload = {
  name: string;
  description: string;
  passed: boolean;
  message: string | null;
};

export type CodePayload = {
  type: "code";
  code: string;
  passed: boolean;
  tests: TestPayload[];
  error: PyErrorPayload | null;
  output: string;
};

export type ExpressionPayload = {
  type: "expression";
  input: string;
  status: "correct" | "different" | "form" | "unparsed" | "unknown-names" | "empty";
  message?: string;
};

export type NumberPayload = {
  type: "number";
  input: string;
  value: number;
  /** The learner's working, for estimates. */
  working?: string;
};

export type ChoicePayload = { type: "choice"; selected: string[] };

export type StepsPayload = { type: "steps"; rules: string[]; wrongLines: number[] };

export type BreakitPayload = { type: "breakit"; selected: string };

export type TextPayload = {
  type: "text";
  body: string;
  criteria: { id: string; met: boolean }[];
  feedback: string | null;
};

export type AnswerPayload =
  | CodePayload
  | ExpressionPayload
  | NumberPayload
  | ChoicePayload
  | StepsPayload
  | BreakitPayload
  | TextPayload;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a stored payload back, or null when it is not an answer payload. */
export function asAnswerPayload(value: unknown): AnswerPayload | null {
  if (!isObject(value) || typeof value.type !== "string") return null;
  switch (value.type) {
    case "code":
    case "expression":
    case "number":
    case "choice":
    case "steps":
    case "breakit":
    case "text":
      return value as AnswerPayload;
    default:
      return null;
  }
}

/** Trims long fields so a payload stays small in the database. */
export function trimPayload<T extends AnswerPayload>(payload: T): T {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}\n[cut]` : s);
  switch (payload.type) {
    case "code":
      return {
        ...payload,
        code: cut(payload.code, 20_000),
        output: cut(payload.output, 4_000),
        tests: payload.tests.slice(0, 50).map((t) => ({
          ...t,
          description: cut(t.description, 400),
          message: t.message === null ? null : cut(t.message, 1_000),
        })),
      };
    case "expression":
      return { ...payload, input: cut(payload.input, 2_000) };
    case "number":
      return { ...payload, input: cut(payload.input, 200), working: payload.working ? cut(payload.working, 4_000) : undefined };
    case "text":
      return { ...payload, body: cut(payload.body, 12_000) };
    default:
      return payload;
  }
}
