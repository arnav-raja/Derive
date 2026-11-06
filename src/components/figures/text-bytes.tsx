"use client";

import { clsx } from "clsx";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

import { FigureFrame, langOf, PredictPanel, type PredictPhase } from "./shell";

/*
 * A text as Python counts it and as a file stores it: each character with its code point, the
 * number Unicode gives it, and the UTF-8 bytes that stand for it. The bits view marks, in each
 * byte, the bits that say where a character starts and how long it is, and the bits that carry
 * its code point. Everything is worked out from the text; nothing is placed by hand.
 */

export type CharBytes = { char: string; codePoint: number; bytes: number[] };

const encoder = new TextEncoder();

/** Each character of a text, as Python counts them, with its code point and its UTF-8 bytes. */
export function utf8Chars(text: string): CharBytes[] {
  return Array.from(text).map((char) => ({
    char,
    codePoint: char.codePointAt(0) ?? 0,
    bytes: Array.from(encoder.encode(char)),
  }));
}

/**
 * How many of a byte's first bits are markers rather than bits of a code point: one for a byte
 * that is a character on its own (0xxxxxxx), two for a byte that continues a character
 * (10xxxxxx), and for the first byte of a longer character, its ones and the zero after them.
 */
export function markerBits(byte: number): number {
  if (byte < 0b1000_0000) return 1;
  if (byte < 0b1100_0000) return 2;
  if (byte < 0b1110_0000) return 3;
  if (byte < 0b1111_0000) return 4;
  return 5;
}

/** A character's code point in base 2, read from the bits its bytes carry, in order. */
export function payloadBits(bytes: number[]): string {
  return bytes.map((b) => b.toString(2).padStart(8, "0").slice(markerBits(b))).join("");
}

const group = (n: number) => n.toLocaleString("en-GB");
const NUMBER_WORDS = ["no", "one", "two", "three", "four"];

function inWords(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A combining mark, such as a Hindi vowel sign, is drawn on a dotted circle so that it can be seen alone. */
function isMark(char: string): boolean {
  return /\p{M}/u.test(char);
}

/** A byte as its marker bits, a space, and the bits that carry the code point, as in "110 00011". */
export function markedBits(byte: number): string {
  const s = byte.toString(2).padStart(8, "0");
  return `${s.slice(0, markerBits(byte))} ${s.slice(markerBits(byte))}`;
}

/** How a character is named in a sentence or a table cell. */
export function charName(char: string): string {
  if (char === " ") return "a space";
  if (char === "\n") return "a new line";
  return isMark(char) ? `◌${char}` : char;
}

/** What a text's bytes come to, in words: "café takes 5 bytes: one byte each for c, a and f, and two for é." */
export function bytesSentence(text: string): string {
  const chars = utf8Chars(text);
  const total = chars.reduce((s, c) => s + c.bytes.length, 0);
  const byCount = new Map<number, string[]>();
  for (const c of chars) {
    const names = byCount.get(c.bytes.length) ?? [];
    const name = charName(c.char);
    if (!names.includes(name)) names.push(name);
    byCount.set(c.bytes.length, names);
  }
  const counts = [...byCount.keys()].sort((a, b) => a - b);
  const parts = counts.map((n, i) => {
    const names = byCount.get(n)!;
    const each = names.length > 1 || chars.filter((c) => c.bytes.length === n).length > 1 ? " each" : "";
    const unit = i === 0 ? (n === 1 ? " byte" : " bytes") : "";
    return `${NUMBER_WORDS[n]}${unit}${each} for ${inWords(names)}`;
  });
  const joined = parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
  return `${text} takes ${group(total)} ${total === 1 ? "byte" : "bytes"}: ${joined}.`;
}

export function TextBytes({
  title,
  description,
  texts,
  predict,
  typingLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** Texts offered as buttons; the first is shown first. */
  texts: string[];
  /** Keeps every text's bytes back until the learner has said how many bytes this text takes. */
  predict?: { text: string; prompt: string };
  /** Typing a text of one's own waits for an exercise; the buttons still work. */
  typingLocked?: boolean;
  /** What the locked typing waits for, shown in its place. */
  lockedNote?: string;
}) {
  const uid = useId();
  const [text, setText] = useState(predict?.text ?? texts[0] ?? "");
  const [bits, setBits] = useState(false);
  const [phase, setPhase] = useState<PredictPhase>("asking");
  const [guess, setGuess] = useState("");
  const revealed = !predict || phase === "revealed";
  const chars = utf8Chars(text);
  const total = chars.reduce((s, c) => s + c.bytes.length, 0);
  const guessed = /^\s*\d+\s*$/.test(guess) ? Number(guess) : null;
  const answer = predict ? utf8Chars(predict.text).reduce((s, c) => s + c.bytes.length, 0) : 0;

  return (
    <FigureFrame
      title={title}
      description={description}
      predict={
        predict ? (
          <PredictPanel
            prompt={predict.prompt}
            phase={phase}
            canLock={guessed !== null}
            lockHint="Type a whole number of bytes to lock it in."
            onLock={() => setPhase("locked")}
            onReveal={() => setPhase("revealed")}
            onReset={() => setPhase("asking")}
            input={
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`${uid}-guess`} className="text-sm font-medium text-ink">
                  Bytes
                </label>
                <input
                  id={`${uid}-guess`}
                  value={guess}
                  onChange={(e) => phase === "asking" && setGuess(e.target.value)}
                  readOnly={phase !== "asking"}
                  inputMode="numeric"
                  autoComplete="off"
                  className={clsx(inputClasses, "h-9 w-24 font-mono")}
                />
              </div>
            }
            verdict={
              <p>
                {bytesSentence(predict.text)} You said {guessed ?? "nothing"}
                {guessed === answer ? ", which is right." : "."}
              </p>
            }
          />
        ) : null
      }
      picture={({ titleId, descId }) => (
        <div role="img" aria-labelledby={titleId} aria-describedby={descId} className="flex flex-wrap gap-2">
          {chars.map((c, i) => (
            <div key={i} className="flex min-w-16 flex-col items-center gap-1 rounded-md border border-rule bg-surface px-2 py-2">
              <span lang={langOf(c.char)} className={clsx("flex h-9 items-center text-2xl leading-none text-ink", c.char === " " && "text-xs text-ink-muted")}>
                {c.char === " " ? "space" : isMark(c.char) ? `◌${c.char}` : c.char}
              </span>
              <span className="tabular text-xs text-ink-muted">{group(c.codePoint)}</span>
              {revealed ? (
                <span className="flex flex-col items-center gap-0.5">
                  {c.bytes.map((b, j) =>
                    bits ? (
                      <span key={j} className="font-mono text-xs tracking-wide">
                        <span className="text-ink-muted">{b.toString(2).padStart(8, "0").slice(0, markerBits(b))}</span>
                        <span className="ml-0.5 font-semibold text-accent">{b.toString(2).padStart(8, "0").slice(markerBits(b))}</span>
                      </span>
                    ) : (
                      <span key={j} className="tabular rounded-xs bg-inset px-1.5 font-mono text-xs text-ink">
                        {b}
                      </span>
                    ),
                  )}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
      controls={
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Texts to try">
            {texts.map((t) => (
              <Button key={t} size="sm" variant={t === text ? "primary" : "secondary"} onClick={() => setText(t)} aria-pressed={t === text} lang={langOf(t)}>
                {t}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-text`} className="text-sm font-medium text-ink">
              A text of your own
            </label>
            <input
              id={`${uid}-text`}
              value={text}
              onChange={(e) => {
                if (!typingLocked) setText(e.target.value);
              }}
              readOnly={typingLocked}
              aria-describedby={typingLocked && lockedNote ? `${uid}-locked` : undefined}
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              className={clsx(inputClasses, "h-9 max-w-sm", typingLocked && "cursor-not-allowed opacity-70")}
            />
            {typingLocked && lockedNote ? (
              <p id={`${uid}-locked`} className="text-sm text-ink-muted">
                {lockedNote} Until then, choose one of the texts above.
              </p>
            ) : null}
          </div>
          <p className="text-sm text-ink" aria-live="polite">
            <span lang={langOf(text)} className="font-semibold">
              {text || "No text"}
            </span>
            : {group(chars.length)} {chars.length === 1 ? "character" : "characters"}
            {revealed ? `, ${group(total)} ${total === 1 ? "byte" : "bytes"} in UTF-8.` : ". The bytes appear once you have made your prediction."}
          </p>
          {revealed ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant={bits ? "primary" : "secondary"} onClick={() => setBits((v) => !v)} aria-pressed={bits}>
                Show the bits
              </Button>
              {bits ? (
                <p className="text-sm text-ink-muted">
                  In each byte, the grey bits say where a character starts and how many bytes it has; the bits in colour, read in
                  order, are its code point in binary.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      }
      table={{
        columns: revealed ? ["Character", "Code point", bits ? "UTF-8 bytes, marker bits first" : "UTF-8 bytes"] : ["Character", "Code point"],
        caption: revealed && bits ? "Each byte is written as its marker bits, a space, and the bits that carry the code point." : undefined,
        rows: chars.map((c) => [charName(c.char), group(c.codePoint), ...(revealed ? [bits ? c.bytes.map(markedBits).join(", ") : c.bytes.join(", ")] : [])]),
      }}
    />
  );
}
