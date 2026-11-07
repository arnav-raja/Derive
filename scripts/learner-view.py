"""Builds a learner's-eye text of one lesson, and a separate answer key.

    python3 -I scripts/learner-view.py <repo> <code> <out_dir>

Used for the quality gate: the simulated learner reads only the learner view,
then marks itself with the answer key. Write <out_dir> outside the repository.

The learner view inlines each exercise as the learner sees it (prompt, options,
input) with no answers, and marks the text that appears only after an exercise
is answered. The answer key holds each exercise's answer and explanation, and
each review variant, so a simulated learner can check itself afterwards.
"""

import os
import re
import sys

import yaml

PHASES = ["1-puzzle", "2-recall", "3-explore", "4-derive", "5-build", "6-explain"]


LETTERS = "abcdefghijklmnopqrstuvwxyz"


def lettered(options):
    """Options as the learner sees them: labels only, never the ids, which can name the answer."""
    return "\n".join(f"   ({LETTERS[i]}) {o['label']}" for i, o in enumerate(options))


def letters_of(options, ids):
    return ", ".join(f"({LETTERS[i]})" for i, o in enumerate(options) if o["id"] in ids)


def test_docstrings(tests):
    """The UI lists each test's docstring, and its failure message when it fails; the code is behind Show the tests."""
    found = re.findall(r'def (test_\w+)\([^)]*\):\s*\n\s*"""(.*?)"""', tests, re.S)
    return "\n".join(f"   - {doc.strip()}" for _, doc in found) or "   (no described checks)"


def answer_shape(ans, kind=None):
    t = ans.get("type")
    if t == "choice":
        many = "Choose all that apply" if ans.get("multiple") else "Choose one"
        return f"{many}:\n{lettered(ans['options'])}"
    if t == "number":
        unit = f" The unit printed after the box is: {ans['unit']}." if ans.get("unit") else ""
        factor = (ans.get("tolerance") or {}).get("factor")
        est = f" Under the box: an estimate within a factor of {factor} either way counts." if kind == "estimate" and factor else ""
        return ("Type a number in the box. Under the box: Whole numbers, decimals, fractions such as 3/8, and "
                f"powers of ten such as 6.2e23 or 6.2 × 10^23 all work.{unit}{est}")
    if t == "expression":
        syms = ", ".join(s["name"] for s in ans.get("symbols", []))
        lhs = f" The box follows: {ans['lhs']}" if ans.get("lhs") else ""
        return (f"Type an expression in the box.{lhs}\nUnder the box: Type * to multiply, / to divide, ^ or ** for a "
                f"power, and functions such as sqrt( ) for a square root. Symbols: {syms}. As you type, the box "
                "shows how it reads your expression.")
    if t == "code":
        files = "".join(
            f"A read-only tab, {name}, shows a file the program can open:\n```text\n{text}```\n"
            for name, text in (ans.get("files") or {}).items())
        return ("Edit this starter program in the editor, run it, and submit when its checks pass:\n"
                f"```python\n{ans['starter']}```\n{files}The checks, as the page describes them:\n{test_docstrings(ans['tests'])}\n"
                "A read-only tab, tests.py, shows the test code itself:\n"
                f"```python\n{ans['tests']}```")
    if t == "breakit":
        return (f"Working program:\n```python\n{ans['code']}```\nAfter the change:\n```python\n{ans['broken']}```\n"
                f"{ans['change']}\nPredict what happens:\n{lettered(ans['options'])}")
    if t == "text":
        rub = "\n".join(f"   - {r['criterion']}" for r in ans["rubric"])
        return f"Write {ans['minWords']} to {ans['maxWords']} words. What a good answer shows:\n{rub}"
    if t == "steps":
        rules = "\n".join(f"   - {r.get('name', '')}: {r['label']}" for r in ans["rules"])
        lines = "\n".join(f"   Line {i + 1}: {l['math']}" for i, l in enumerate(ans["lines"]))
        return f"Rules:\n{rules}\nStart: {ans['start']}\n{lines}\nChoose the rule that justifies each line."
    return f"(answer type {t})"


def answer_key(ans):
    t = ans.get("type")
    if t == "choice":
        return f"correct: {letters_of(ans['options'], ans['correct'])}"
    if t == "number":
        tol = ans.get("tolerance") or {}
        extra = f", within a factor of {tol['factor']}" if tol.get("factor") else (
            f", relative tolerance {tol['rel']}" if tol.get("rel") else (
                f", give or take {tol['abs']}" if tol.get("abs") else ""))
        return f"{ans['value']} {ans.get('unit', '')}{extra}"
    if t == "expression":
        return f"{ans['reference']} (also accepted: {ans.get('accept', [])})"
    if t == "code":
        return f"reference solution:\n```python\n{ans['reference']}```"
    if t == "breakit":
        return "the option whose condition holds: " + "; ".join(
            f"({LETTERS[i]}) when {o['when']}" for i, o in enumerate(ans["options"]))
    if t == "steps":
        names = {r["id"]: r.get("name", r["id"]) for r in ans["rules"]}
        return "rules in order: " + ", ".join(names[l["rule"]] for l in ans["lines"])
    if t == "text":
        rub = "\n".join(f"   - {r['criterion']}" for r in ans["rubric"])
        return (f"graded against the rubric:\n{rub}\n\nA reference answer that meets it:\n"
                f"{ans.get('reference', '').strip()}")
    return ""


def format_number(value):
    """A number as the app shows it (formatNumber in src/lib/content/views.tsx): digits grouped in
    threes, and very large or very small values as a power of ten."""
    if value != 0 and (abs(value) >= 1e6 or abs(value) < 1e-3):
        mantissa, exponent = f"{value:.3e}".split("e")
        if float(value).is_integer() and abs(value) < 1e15 and float(f"{value:.3e}") != value:
            return f"{int(value):,}"
        return f"${float(mantissa):g} \\times 10^{{{int(exponent)}}}$"
    text = f"{value:,.6f}".rstrip("0").rstrip(".")
    return text


def shown_after(e):
    """What the app shows under an exercise once it is answered: the answer and why for a one-try
    question, and the explanation once a worked one is solved."""
    ans, why = e["answer"], (e.get("explanation") or "").strip()
    if e["kind"] in ("predict", "recall", "estimate"):
        t = ans.get("type")
        if t == "choice":
            said = "; ".join(o["label"].removesuffix(".") for o in ans["options"] if o["id"] in ans["correct"])
        elif t == "number":
            said = f"{format_number(ans['value'])}{(' ' + ans['unit']) if ans.get('unit') else ''}"
        else:
            said = ""
        # The app states the answer only for choices and numbers; an expression's comes in the explanation.
        line = f"Answer: {said}. " if said else ""
        return (f"\n[ONCE YOU HAVE ANSWERED {e['id']}, THE APP SHOWS: The answer, and why. {line}{why}]\n")
    if why:
        return f"\n[ONCE YOU HAVE SOLVED {e['id']}, THE APP SHOWS: Why. {why}]\n"
    return ""


def hide_figure_answers(text):
    """A figure's predict holds the value the learner is asked to guess; the page never shows it first."""
    def strip(m):
        return re.sub(r",\s*value:\s*[^,}]+", "", m.group(0))
    return re.sub(r"predict=\{\{.*?\}\}", strip, text, flags=re.S)


def main():
    repo, code, out = sys.argv[1], sys.argv[2], sys.argv[3]
    base = os.path.join(repo, "content", "lessons", code)
    data = yaml.safe_load(open(os.path.join(base, "exercises.yaml"), encoding="utf8"))
    exercises = {e["id"]: e for e in data["exercises"]}
    lesson = yaml.safe_load(open(os.path.join(base, "lesson.yaml"), encoding="utf8"))

    view = [f"# {code} {lesson['title']}\n", f"{lesson.get('summary', '')}\n"]
    for phase in PHASES:
        text = open(os.path.join(base, f"{phase}.mdx"), encoding="utf8").read()

        def exercise(m):
            e = exercises.get(m.group(1))
            if not e:
                return f"[missing exercise {m.group(1)}]"
            return (f"\n> EXERCISE {e['id']} ({e['kind']}): {e.get('title', '')}\n> {e['prompt'].strip()}\n\n"
                    f"{answer_shape(e['answer'], e['kind'])}\n{shown_after(e)}")

        text = hide_figure_answers(text)
        text = re.sub(r'<Exercise id="([^"]+)"\s*/>', exercise, text)
        text = re.sub(r'<Reveal for="([^"]+)">',
                      lambda m: f"\n[THE TEXT BELOW APPEARS ONLY AFTER YOU ANSWER {m.group(1)}]\n", text)
        text = text.replace("</Reveal>", "\n[END OF THE PART THAT WAS HIDDEN]\n")
        text = re.sub(r'<Reteach for="([^"]+)">',
                      lambda m: f"\n[RE-TEACH, SHOWN ONLY IF YOU MISSED {m.group(1)}]\n", text)
        text = text.replace("</Reteach>", "\n[END OF RE-TEACH]\n")
        text = text.replace("<MixedCheck />", "\n[A MIXED CHECK OF REVIEW QUESTIONS APPEARS HERE]\n")
        view.append(f"\n\n---\n## Phase {phase}\n\n{text}")

    # The variants' questions come before any of their answers, so they can be tried blind.
    key = [f"# Answer key for {code}\n"]
    for e in data["exercises"]:
        key.append(f"\n## {e['id']}\n{answer_key(e['answer'])}\n\nExplanation: {e.get('explanation', '').strip()}\n")
    variants = [(e, i, v) for e in data["exercises"] for i, v in enumerate((e.get("review") or {}).get("variants", []))]
    if variants:
        key.append("\n\n# Review variants: questions only (answer them all before reading on)\n")
        for e, i, v in variants:
            key.append(f"\n## {e['id']} variant {i}\n{v['prompt'].strip()}\n{answer_shape(v['answer'])}\n")
        key.append("\n\n# Review variants: answers\n")
        for e, i, v in variants:
            key.append(f"\n## {e['id']} variant {i}\nAnswer: {answer_key(v['answer'])}\n"
                       f"Explanation: {v.get('explanation', '').strip()}\n")

    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, f"learner-view-{code}.md"), "w", encoding="utf8").write("".join(view))
    open(os.path.join(out, f"answer-key-{code}.md"), "w", encoding="utf8").write("".join(key))
    print("wrote", out)


if __name__ == "__main__":
    main()
