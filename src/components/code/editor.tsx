"use client";

import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { clsx } from "clsx";
import { useEffect, useRef } from "react";

/*
 * A Python editor on CodeMirror 6. It is drawn as a dark workbench in both
 * themes, from the code tokens in globals.css. Tab indents; Escape then Tab
 * leaves the editor, so keyboard users are never trapped. Ctrl or Cmd with
 * Enter runs the code, and with Shift as well it runs the tests.
 */

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword], color: "var(--code-keyword)" },
  { tag: [t.string, t.special(t.string)], color: "var(--code-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--code-number)" },
  { tag: [t.comment, t.lineComment], color: "var(--code-muted)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName)), t.function(t.propertyName)], color: "var(--code-function)" },
  { tag: [t.definition(t.className), t.className], color: "var(--code-function)", fontWeight: "600" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--code-operator)" },
  { tag: [t.self, t.special(t.variableName)], color: "var(--code-keyword)", fontStyle: "italic" },
]);

const theme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--code-bg)",
      color: "var(--code-ink)",
      fontSize: "0.875rem",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.65" },
    ".cm-content": { padding: "12px 0", caretColor: "var(--code-ink)" },
    ".cm-line": { padding: "0 16px 0 12px" },
    ".cm-gutters": {
      backgroundColor: "var(--code-bg)",
      color: "var(--code-muted)",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "2.5ch", padding: "0 4px 0 0", opacity: "0.75" },
    ".cm-activeLine": { backgroundColor: "var(--code-active)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--code-active)", color: "var(--code-ink)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "var(--code-selection) !important",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--code-ink)", borderLeftWidth: "2px" },
    ".cm-placeholder": { color: "var(--code-muted)" },
    ".cm-matchingBracket": { backgroundColor: "var(--code-selection)", outline: "1px solid var(--code-rule)" },
  },
  { dark: true },
);

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  readOnly?: boolean;
  placeholder?: string;
  minLines?: number;
  /** Ctrl or Cmd with Enter. */
  onRun?: () => void;
  /** Ctrl or Cmd with Shift and Enter. */
  onCheck?: () => void;
  /** Fill the height of the parent and scroll inside, as in the full-screen workbench. */
  fill?: boolean;
  className?: string;
};

export function CodeEditor({ value, onChange, label, readOnly = false, placeholder, minLines = 6, onRun, onCheck, fill = false, className }: EditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const changeRef = useRef(onChange);
  const runRef = useRef(onRun);
  const checkRef = useRef(onCheck);

  useEffect(() => {
    changeRef.current = onChange;
    runRef.current = onRun;
    checkRef.current = onCheck;
  }, [onChange, onRun, onCheck]);

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
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
        EditorView.theme(
          fill
            ? { "&": { height: "100%" }, ".cm-scroller": { overflow: "auto" } }
            : { ".cm-content": { minHeight: `${minLines * 1.65}em` } },
        ),
        placeholder ? placeholderExt(placeholder) : [],
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              if (!runRef.current) return false;
              runRef.current();
              return true;
            },
          },
          {
            key: "Shift-Mod-Enter",
            run: () => {
              if (!checkRef.current) return false;
              checkRef.current();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
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
  }, [readOnly, label, fill]);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className={clsx("min-w-0 bg-code-bg", fill && "h-full min-h-0", className)} />;
}
