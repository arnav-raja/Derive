"use client";

import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers, placeholder as placeholderExt } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";

/*
 * A Python editor on CodeMirror 6, themed only with Derive's tokens so it
 * follows light and dark mode. Tab indents; Escape then Tab leaves the
 * editor, so keyboard users are never trapped.
 */

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "var(--accent)", fontWeight: "600" },
  { tag: [t.string, t.special(t.string)], color: "var(--correct)" },
  { tag: [t.number, t.bool, t.null], color: "var(--fig-gradient)" },
  { tag: [t.comment, t.lineComment], color: "var(--ink-faint)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: "var(--hint)" },
  { tag: [t.operator, t.punctuation], color: "var(--ink-muted)" },
]);

const theme = EditorView.theme({
  "&": {
    backgroundColor: "var(--inset)",
    color: "var(--ink)",
    fontSize: "0.875rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--rule)",
  },
  "&.cm-focused": { outline: "2px solid var(--focus)", outlineOffset: "2px" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "12px 0", caretColor: "var(--ink)" },
  ".cm-gutters": {
    backgroundColor: "var(--inset)",
    color: "var(--ink-faint)",
    border: "none",
    borderRight: "1px solid var(--rule)",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent-soft) 45%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--ink)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--accent-soft) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  ".cm-placeholder": { color: "var(--ink-faint)" },
  ".cm-matchingBracket": { backgroundColor: "var(--accent-soft)", outline: "1px solid var(--rule-strong)" },
});

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  readOnly?: boolean;
  placeholder?: string;
  minLines?: number;
};

export function CodeEditor({ value, onChange, label, readOnly = false, placeholder, minLines = 6 }: EditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const changeRef = useRef(onChange);

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        indentOnInput(),
        indentUnit.of("    "),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        python(),
        syntaxHighlighting(highlight),
        theme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.contentAttributes.of({ "aria-label": label, "aria-multiline": "true", role: "textbox" }),
        EditorView.theme({ ".cm-content": { minHeight: `${minLines * 1.5}em` } }),
        placeholder ? placeholderExt(placeholder) : [],
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) changeRef.current(u.state.doc.toString());
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor is created once; later value changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, label]);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="min-w-0" />;
}
