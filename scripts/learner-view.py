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


def answer_shape(ans):
    t = ans.get("type")
    if t == "choice":
        many = "Choose all that apply" if ans.get("multiple") else "Choose one"
        opts = "\n".join(f"   ({o['id']}) {o['label']}" for o in ans["options"])
        return f"{many}:\n{opts}"
    if t == "number":
        unit = f" in {ans['unit']}" if ans.get("unit") else ""
        return f"Type a number{unit}."
    if t == "expression":
        syms = ", ".join(s["name"] for s in ans.get("symbols", []))
        lhs = f" after '{ans['lhs']}'" if ans.get("lhs") else ""
        return f"Type an expression{lhs} in Python syntax, using the symbols {syms}."
    if t == "code":
        return ("Edit this starter program so its tests pass (the tests are shown to the learner too):\n"
                f"```python\n{ans['starter']}```\nTests:\n```python\n{ans['tests']}```")
    if t == "breakit":
        opts = "\n".join(f"   ({o['id']}) {o['label']}" for o in ans["options"])
        return (f"Working program:\n```python\n{ans['code']}```\nAfter the change:\n```python\n{ans['broken']}```\n"
                f"{ans['change']}\nPredict what happens:\n{opts}")
    if t == "text":
        rub = "\n".join(f"   - {r['criterion']}" for r in ans["rubric"])
        return f"Write {ans['minWords']} to {ans['maxWords']} words. What a good answer shows:\n{rub}"
    if t == "steps":
        rules = "\n".join(f"   ({r['id']}) {r.get('name', '')} {r['label']}" for r in ans["rules"])
        lines = "\n".join(f"   Line {i + 1}: {l['math']}" for i, l in enumerate(ans["lines"]))
        return f"Rules:\n{rules}\nStart: {ans['start']}\n{lines}\nChoose the rule that justifies each line."
    return f"(answer type {t})"


def answer_key(ans):
    t = ans.get("type")
    if t == "choice":
        return f"correct: {', '.join(ans['correct'])}"
    if t == "number":
        tol = f", within a factor of {ans['factor']}" if ans.get("factor") else (f", relative tolerance {ans['rel']}" if ans.get("rel") else "")
        return f"{ans['value']} {ans.get('unit', '')}{tol}"
    if t == "expression":
        return f"{ans['reference']} (also accepted: {ans.get('accept', [])})"
    if t == "code":
        return f"reference solution:\n```python\n{ans['reference']}```"
    if t == "breakit":
        return "the option whose condition holds: " + "; ".join(f"{o['id']} when {o['when']}" for o in ans["options"])
    if t == "steps":
        return "rules in order: " + ", ".join(l["rule"] for l in ans["lines"])
    if t == "text":
        return "graded against the rubric"
    return ""


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
                    f"{answer_shape(e['answer'])}\n")

        text = re.sub(r'<Exercise id="([^"]+)"\s*/>', exercise, text)
        text = re.sub(r'<Reveal for="([^"]+)">',
                      lambda m: f"\n[THE TEXT BELOW APPEARS ONLY AFTER YOU ANSWER {m.group(1)}]\n", text)
        text = text.replace("</Reveal>", "\n[END OF THE PART THAT WAS HIDDEN]\n")
        text = re.sub(r'<Reteach for="([^"]+)">',
                      lambda m: f"\n[RE-TEACH, SHOWN ONLY IF YOU MISSED {m.group(1)}]\n", text)
        text = text.replace("</Reteach>", "\n[END OF RE-TEACH]\n")
        text = text.replace("<MixedCheck />", "\n[A MIXED CHECK OF REVIEW QUESTIONS APPEARS HERE]\n")
        view.append(f"\n\n---\n## Phase {phase}\n\n{text}")

    key = [f"# Answer key for {code}\n"]
    for e in data["exercises"]:
        key.append(f"\n## {e['id']}\n{answer_key(e['answer'])}\n\nExplanation: {e.get('explanation', '').strip()}\n")
        for i, v in enumerate((e.get("review") or {}).get("variants", [])):
            key.append(f"\nReview variant {i}: {v['prompt'].strip()}\n{answer_shape(v['answer'])}\n"
                       f"Answer: {answer_key(v['answer'])}\nExplanation: {v.get('explanation', '').strip()}\n")

    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, f"learner-view-{code}.md"), "w", encoding="utf8").write("".join(view))
    open(os.path.join(out, f"answer-key-{code}.md"), "w", encoding="utf8").write("".join(key))
    print("wrote", out)


if __name__ == "__main__":
    main()
