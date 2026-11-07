"""
Derive's Python harness.

It runs a learner's code and its tests, checks expressions with SymPy,
evaluates break-it outcomes and records execution traces for figures. The same
file runs in the browser (inside a web worker) and in Node
(scripts/check-exercises.ts), so a check behaves the same in both places.

Every public function takes and returns a JSON string.
"""

import ast
import contextlib
import io
import json
import math
import opcode
import os
import re
import sys
import traceback
import zlib

LEARNER_FILE = "<your code>"
TESTS_FILE = "<tests>"
WORKDIR = "/home/pyodide/work"


class StepLimit(Exception):
    """Raised when code runs for longer than its budget of traced steps."""


class InputUnavailable(Exception):
    pass


# Python's limit on calls in progress. A program may raise it, but never above _SAFE_LIMIT: much
# deeper, a recursion overflows the JavaScript stack that Pyodide runs on (in Chromium's worker
# at about 4,000 calls, in Node at about 7,000), and Pyodide may be unable to run anything more.
# The limit is put back after every run, so that a raise never carries into the next program.
_SAFE_LIMIT = 2000


@contextlib.contextmanager
def _guarded_limit():
    before = sys.getrecursionlimit()
    real = sys.setrecursionlimit

    def capped(limit):
        real(min(int(limit), _SAFE_LIMIT))

    sys.setrecursionlimit = capped
    try:
        yield
    finally:
        sys.setrecursionlimit = real
        real(before)


# Calls of special methods, such as __call__, __repr__, __eq__ and __add__, that may be in
# progress at once. Python reaches each of them through more of Pyodide's C code than a plain call,
# so a few hundred of them, one inside another, overflow the JavaScript stack before Python's own
# limit is reached, and Pyodide stops for good. In Chromium's worker that happens between 300 and
# 400 calls deep for __call__, and between 500 and 600 for __repr__, __eq__ and __add__; Firefox
# and Safari are untested. A runaway is stopped here instead, with the RecursionError that Python
# gives for any other recursion that runs out of room.
_CALL_LIMIT = 200


def _is_special(name):
    """Whether a function's name is a special method's, such as __call__ or __repr__."""
    return len(name) > 4 and name.startswith("__") and name.endswith("__")


def _calls_in_progress(frame):
    """How many calls of special methods are in progress, the one starting at frame included."""
    n = 0
    while frame is not None:
        if _is_special(frame.f_code.co_name):
            n += 1
        frame = frame.f_back
    return n


def _counting_tracer(limit):
    """A trace function that stops learner code after `limit` line events."""
    count = 0

    def local(frame, event, arg):
        nonlocal count
        if event == "line":
            count += 1
            if count > limit:
                raise StepLimit()
        return local

    def tracer(frame, event, arg):
        if frame.f_code.co_filename in (LEARNER_FILE, TESTS_FILE):
            name = frame.f_code.co_name
            if _is_special(name) and _calls_in_progress(frame) > _CALL_LIMIT:
                suffix = " while calling a Python object" if name == "__call__" else ""
                raise RecursionError("maximum recursion depth exceeded" + suffix)
            return local
        return None

    return tracer


def _learner_frame(exc):
    """The frame of the learner's code where an exception was raised, and its line, if any.

    Python raises RecursionError as a new call starts, while its frame still stands at the `def`
    line, so for that error the call that went one too deep is given instead."""
    entries = [(frame, lineno) for frame, lineno in traceback.walk_tb(exc.__traceback__)
               if frame.f_code.co_filename == LEARNER_FILE]
    if not entries:
        return None
    frame, line = entries[-1]
    if isinstance(exc, RecursionError) and len(entries) > 1 and line == frame.f_code.co_firstlineno:
        return entries[-2]
    return frame, line


def _learner_line(exc):
    """The line in the learner's code where an exception was raised, if any."""
    found = _learner_frame(exc)
    return found[1] if found else None


def _test_error(exc):
    """An error a test ran into, said as the console says a program's error, with the place in
    the learner's code it came from: "IndexError on line 10, in read_log: list index out of
    range". An error that came from the tests alone has no place in the learner's code."""
    described = _describe(exc)
    label = "Stopped" if described["type"] == "StepLimit" else described["type"]
    found = _learner_frame(exc)
    if found:
        frame, line = found
        name = frame.f_code.co_name
        label += f" on line {line:,}" if name == "<module>" else f" on line {line:,}, in {name}"
    # An assert with no message raises AssertionError with an empty one, as the console shows it.
    return f"{label}: {described['message']}" if described["message"] else label


def _raised_in_learner_code(exc):
    """True when an exception was raised by a line of the learner's own code, such as an assert of
    theirs, so that it is shown as the console shows a program's error, not as a test's message."""
    frames = list(traceback.walk_tb(exc.__traceback__))
    return bool(frames) and frames[-1][0].f_code.co_filename == LEARNER_FILE


def _describe(exc):
    if isinstance(exc, StepLimit):
        return {
            "type": "StepLimit",
            "message": "The code ran for too long and was stopped. Is there a loop that never ends, or code that runs a very large number of times?",
            "line": _learner_line(exc),
        }
    if isinstance(exc, SyntaxError):
        return {"type": "SyntaxError", "message": exc.msg, "line": exc.lineno, "col": exc.offset}
    message = str(exc)
    if isinstance(exc, KeyError) and exc.args:
        message = repr(exc.args[0])
    return {"type": type(exc).__name__, "message": message, "line": _learner_line(exc)}


def _fake_input(lines):
    queue = list(lines or [])
    typed = len(queue)

    def fake(prompt=""):
        if not queue:
            if typed:
                lines_word = "line was" if typed == 1 else "lines were"
                raise InputUnavailable(
                    f"input() was called again after all {typed:,} typed {lines_word} read."
                )
            raise InputUnavailable(
                "input() has nothing to read here. Set the value in your code instead."
            )
        value = queue.pop(0)
        print(f"{prompt}{value}")
        return value

    return fake


def _prepare_files(files):
    os.makedirs(WORKDIR, exist_ok=True)
    for name in os.listdir(WORKDIR):
        path = os.path.join(WORKDIR, name)
        if os.path.isfile(path):
            os.remove(path)
    for name, content in (files or {}).items():
        if "/" in name or name.startswith("."):
            continue
        with open(os.path.join(WORKDIR, name), "w", encoding="utf-8") as handle:
            handle.write(content)
    os.chdir(WORKDIR)


def _execute(code, max_steps, stdin=None, files=None):
    """Runs code in a fresh namespace. Returns (namespace, output, error)."""
    _prepare_files(files)
    ns = {"__name__": "__main__", "input": _fake_input(stdin)}
    out = io.StringIO()
    error = None
    try:
        compiled = compile(code, LEARNER_FILE, "exec")
    except SyntaxError as exc:
        return ns, "", _describe(exc)
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        sys.settrace(_counting_tracer(max_steps))
        try:
            exec(compiled, ns)
        except BaseException as exc:  # noqa: BLE001 - every failure is reported
            error = _describe(exc)
        finally:
            sys.settrace(None)
    return ns, out.getvalue(), error


# Helpers available inside tests ------------------------------------------------


def close(a, b, rel=1e-9, abs_tol=1e-12):
    """True when two numbers agree to a relative tolerance."""
    try:
        return math.isclose(float(a), float(b), rel_tol=rel, abs_tol=abs_tol)
    except (TypeError, ValueError, OverflowError):
        return False


def within_factor(a, b, factor):
    """True when positive a is within a factor of positive b."""
    try:
        a, b = float(a), float(b)
    except (TypeError, ValueError, OverflowError):
        return False
    return a > 0 and b > 0 and b / factor <= a <= b * factor


def _test_functions(env):
    found = []
    for name, value in env.items():
        code = getattr(value, "__code__", None)
        if name.startswith("test_") and code is not None and code.co_filename == TESTS_FILE:
            found.append((code.co_firstlineno, name, value))
    found.sort()
    return [(name, fn) for _, name, fn in found]


def _rerun_helper(code, max_steps, files):
    """rerun(*lines) runs the learner's program again, typing these lines at its input() calls.

    It returns (names, printed): the program's names and what it printed. A program that
    stops with an error fails the test that reran it, with the error and the input named.
    """

    def rerun(*lines):
        typed = [str(line) for line in lines]
        tracer = sys.gettrace()
        try:
            again, printed, error = _execute(code, max_steps, typed, files)
        finally:
            sys.settrace(tracer)
        if error:
            shown = ", ".join(typed) if typed else "no input"
            said = f"{error['type']}: {error['message']}" if error["message"] else error["type"]
            raise AssertionError(f"Typing {shown}, the program stopped with {said}")
        names = {k: v for k, v in again.items() if k not in ("__builtins__", "__name__", "input")}
        return names, printed

    return rerun


def _run_tests(ns, output, tests, max_steps, code=None, files=None):
    env = {k: v for k, v in ns.items() if k != "__builtins__"}
    env.update({"close": close, "within_factor": within_factor, "output": output, "math": math})
    if code is not None:
        env["rerun"] = _rerun_helper(code, max_steps, files)
    results = []
    try:
        exec(compile(tests, TESTS_FILE, "exec"), env)
    except BaseException as exc:  # noqa: BLE001
        return [{"name": "tests", "description": "The tests could not start.", "passed": False,
                 "message": _test_error(exc)}]
    for name, fn in _test_functions(env):
        doc = (fn.__doc__ or name.replace("_", " ")).strip().splitlines()[0]
        entry = {"name": name, "description": doc, "passed": True, "message": None}
        sink = io.StringIO()
        with contextlib.redirect_stdout(sink):
            sys.settrace(_counting_tracer(max_steps))
            try:
                fn()
            except AssertionError as exc:
                entry["passed"] = False
                if _raised_in_learner_code(exc):
                    entry["message"] = _test_error(exc)
                    entry["line"] = _learner_line(exc)
                else:
                    entry["message"] = str(exc) or "This check did not hold."
            except BaseException as exc:  # noqa: BLE001
                entry["passed"] = False
                entry["message"] = _test_error(exc)
                entry["line"] = _learner_line(exc)
            finally:
                sys.settrace(None)
        results.append(entry)
    return results


def run(payload):
    with _guarded_limit():
        return _run(payload)


def _run(payload):
    code = payload["code"]
    tests = payload.get("tests")
    max_steps = int(payload.get("maxSteps", 2_000_000))
    ns, output, error = _execute(code, max_steps, payload.get("stdin"), payload.get("files"))
    result = {"output": output[-20000:], "error": error, "tests": [], "passed": error is None}
    if tests and error is None:
        result["tests"] = _run_tests(ns, output, tests, max_steps, code, payload.get("files"))
        result["passed"] = all(t["passed"] for t in result["tests"])
    return result


def breakit(payload):
    with _guarded_limit():
        return _breakit(payload)


def _breakit(payload):
    max_steps = int(payload.get("maxSteps", 2_000_000))
    base_ns, base_output, base_error = _execute(payload["code"], max_steps)
    ns, output, error = _execute(payload["broken"], max_steps)
    env = {k: v for k, v in ns.items() if k != "__builtins__"}
    env.update({
        "base": {k: v for k, v in base_ns.items() if k != "__builtins__"},
        "error": error["type"] if error else None,
        "output": output,
        "math": math,
    })
    matches = []
    for option in payload["options"]:
        try:
            if eval(option["when"], env):  # noqa: S307 - authored by Derive, not the learner
                matches.append(option["id"])
        except Exception:  # noqa: BLE001 - an option that cannot be evaluated does not hold
            pass
    return {
        "matches": matches,
        "output": output[-20000:],
        "error": error,
        "baseOutput": base_output[-20000:],
        "baseError": base_error,
    }


# Traces for the program trace figure --------------------------------------------


def _safe_repr(value, limit=80):
    try:
        if isinstance(value, type):
            text = f"<class {value.__name__}>"
        elif callable(value) and hasattr(value, "__name__"):
            text = f"<function {value.__name__}>"
        else:
            text = repr(value)
    except Exception:  # noqa: BLE001
        text = "<unprintable>"
    return _cut(text, limit)


def _cut(text, limit):
    return text if limit is None or len(text) <= limit else text[: limit - 1] + "…"


_ADDRESS = re.compile(r" at 0x[0-9a-fA-F]+>")


def _plain(text):
    """A value's text without a memory address, such as <generator object read>: the address
    tells a learner nothing, and two runs of one program give different ones."""
    return _ADDRESS.sub(">", text)


# A generator's code, and the instruction at which it hands out a value and pauses.
_CO_GENERATOR = 0x20
_YIELD_VALUE = opcode.opmap["YIELD_VALUE"]


def _at_yield(frame):
    """Whether a generator's frame is leaving at a yield, to go on when it is next asked for a
    value, rather than at the end of its body."""
    try:
        return frame.f_code.co_code[frame.f_lasti] == _YIELD_VALUE
    except IndexError:
        return False


def _is_object(value):
    """An object of a class that the learner's program defines, such as a Config or a Value."""
    return (
        not isinstance(value, type)
        and getattr(type(value), "__module__", None) == "__main__"
        and hasattr(value, "__dict__")
    )


def _readable_attrs(value):
    """The attributes that reading value.name finds, as Python looks them up: an object's own
    first, then its class's and its bases'. For a class, its own and its bases'. Methods and
    special names are left out, since a question asks only for data, such as self.losses."""
    found = dict(vars(value)) if not isinstance(value, type) else {}
    for c in (value if isinstance(value, type) else type(value)).__mro__:
        if c is object:
            continue
        for a, x in vars(c).items():
            if a in found or (a.startswith("__") and a.endswith("__")) or callable(x):
                continue
            if isinstance(x, (staticmethod, classmethod, property)):
                continue
            found[a] = x
    return found


def _is_function(value):
    """A function or method, which repr would show with its memory address."""
    return callable(value) and hasattr(value, "__name__") and not isinstance(value, type)


def _holds_object(value, depth=0, seen=None):
    """Whether a value is, or a list, tuple, dict or set holds anywhere inside it, an object of a
    learner's class or a function, so that the trace shows each part on its own, and a function
    by its name rather than by repr, which gives its memory address."""
    if _is_object(value) or _is_function(value):
        return True
    if depth > 6 or not isinstance(value, (list, tuple, dict, set, frozenset)):
        return False
    seen = set() if seen is None else seen
    if id(value) in seen:
        return False
    seen.add(id(value))
    items = list(value.items()) if isinstance(value, dict) else list(value)
    for item in items:
        for part in (item if isinstance(value, dict) else (item,)):
            if _holds_object(part, depth + 1, seen):
                return True
    return False


def _is_class(value):
    """A class that the learner's program defines."""
    return isinstance(value, type) and getattr(value, "__module__", None) == "__main__"


def _class_parts(cls):
    """A learner's class: the attributes kept on the class itself, such as `losses`, and its methods."""
    data, methods = [], []
    for k, v in vars(cls).items():
        if callable(v) or isinstance(v, (staticmethod, classmethod, property)):
            methods.append(k)
        elif not k.startswith("__"):
            data.append((k, v))
    return data, methods


def _digest(value):
    """A fingerprint of a value's whole text, so that a change past the cut still shows."""
    try:
        return zlib.crc32(repr(value).encode())
    except Exception:  # noqa: BLE001
        return 0


def _visible(name, value):
    if name.startswith("__") or name == "input":
        return False
    return type(value).__name__ != "module"


# The collections whose identity a trace shows, so that two names for one list can be told from
# two lists that hold equal values. Objects of the learner's own classes are tagged too.
_TAGGED = (("list", list), ("dict", dict), ("set", set))


def trace(payload):
    with _guarded_limit():
        return _trace(payload)


def _trace(payload):
    code = payload["code"]
    max_events = int(payload.get("maxEvents", 1000))
    steps = []
    out = io.StringIO()
    ns = {"__name__": "__main__", "input": _fake_input(payload.get("stdin"))}
    error = None
    # Each list, dict or set gets a tag the first time a name refers to it, such as "list 1", kept
    # for the whole trace. The objects are kept alive here, so that no later object reuses an id.
    tags = {}
    kept = []
    counts = {}

    def tag(value):
        if _is_class(value):
            # A class the program defines is named by itself, such as class Run.
            if id(value) not in tags:
                tags[id(value)] = f"class {value.__name__}"
                kept.append(value)
            return tags[id(value)]
        kind = next((k for k, cls in _TAGGED if isinstance(value, cls)), None)
        if kind is None and _is_object(value):
            # An object of the learner's own class is tagged by its class, such as Config 1.
            kind = type(value).__name__
        if kind is None:
            return None
        key = id(value)
        if key not in tags:
            counts[kind] = counts.get(kind, 0) + 1
            tags[key] = f"{kind} {counts[kind]}"
            kept.append(value)
        return tags[key]

    def shown(value, top=True, depth=0):
        """A value as the trace shows it. An object of the learner's own class shows its
        attributes, such as `lr=0.01, batch=32`, and inside another value, its tag, such as
        Config 1, so that two references to one object can be told apart. Every other value is
        shown as repr shows it."""
        if _is_object(value):
            if not top:
                return tag(value)
            attrs = vars(value)
            if not attrs:
                return "no attributes"
            return ", ".join(f"{k}={shown(v, False, depth + 1)}" for k, v in attrs.items())
        if _is_class(value):
            if not top:
                return tag(value)
            data, methods = _class_parts(value)
            bases = [b.__name__ for b in value.__bases__ if b is not object]
            parts = ["subclass of " + ", ".join(bases)] if bases else []
            parts += [f"{k}={shown(v, False, depth + 1)}" for k, v in data]
            if methods:
                parts.append("methods: " + ", ".join(methods))
            return "; ".join(parts) if parts else "no attributes"
        if depth > 6 or not _holds_object(value):
            return _plain(_safe_repr(value, None))
        if isinstance(value, list):
            return "[" + ", ".join(shown(x, False, depth + 1) for x in value) + "]"
        if isinstance(value, tuple):
            inner = ", ".join(shown(x, False, depth + 1) for x in value)
            return "(" + inner + ("," if len(value) == 1 else "") + ")"
        if isinstance(value, dict):
            return "{" + ", ".join(f"{shown(k, False, depth + 1)}: {shown(v, False, depth + 1)}" for k, v in value.items()) + "}"
        if isinstance(value, (set, frozenset)):
            return "{" + ", ".join(shown(x, False, depth + 1) for x in value) + "}"
        return _plain(_safe_repr(value, None))

    def text(value, limit=80):
        try:
            return _cut(shown(value), limit)
        except Exception:  # noqa: BLE001
            return _safe_repr(value, limit)

    def digest(value):
        try:
            return zlib.crc32(shown(value).encode())
        except Exception:  # noqa: BLE001
            return _digest(value)

    def argument(value):
        """A call's argument as its heading shows it: an object by its tag, anything else as repr."""
        return tag(value) if _is_object(value) else _cut(_plain(_safe_repr(value, None)), 24)

    def name_of(code):
        """A method by its class, such as Config.__init__; a function by its name."""
        qual = getattr(code, "co_qualname", code.co_name)
        return code.co_name if "<locals>" in qual else qual

    def frame_entry(f):
        """One frame as a step shows it: the call, the line it is at and its names."""
        scope = f.f_globals if f.f_code.co_name == "<module>" else f.f_locals
        names = [(k, v) for k, v in scope.items() if _visible(k, v)]
        entry = {
            "function": "(main program)" if f.f_code.co_name == "<module>" else name_of(f.f_code),
            "line": f.f_lineno,
            "variables": {k: text(v) for k, v in names},
        }
        if id(f) in numbers:
            # The call's number, so that one call can be followed from step to step, even a
            # generator's, which leaves the stack at each yield and comes back to it.
            entry["id"] = numbers[id(f)]
        if f.f_code.co_name != "<module>":
            # The call as it began, such as countdown(2), so that calls of one function can be
            # told apart.
            entry["call"] = f"{name_of(f.f_code)}({begun.get(id(f), '')})"
            if f.f_code.co_flags & _CO_GENERATOR:
                entry["generator"] = True
        refs = {k: t for k, t in ((k, tag(v)) for k, v in names) if t}
        if refs:
            entry["refs"] = refs
            # The shown value is cut at 80 characters, so a change further along is found
            # by comparing fingerprints of the whole value.
            entry["digests"] = {k: digest(v) for k, v in names if k in refs}
        # An object's attributes one by one, so that a question can ask for one, such as
        # self.count, with those it finds in its class, such as self.losses for a list
        # kept in the class, and a class's own, such as Run.losses.
        attrs = {
            k: {a: _cut(shown(x, False), 80) for a, x in _readable_attrs(v).items()}
            for k, v in names
            if _is_object(v) or (isinstance(v, type) and getattr(v, "__module__", None) == "__main__")
        }
        attrs = {k: a for k, a in attrs.items() if a}
        if attrs:
            entry["attrs"] = attrs
        return entry

    def snapshot(frame):
        frames = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == LEARNER_FILE:
                frames.append(f)
            f = f.f_back
        # From the main program inwards, so that tags are given in the order the stack is read.
        return [frame_entry(f) for f in reversed(frames)]

    # An error seen in a frame, kept until that frame runs another line. A return straight after
    # it means that the error stopped the frame, which then gave back no value.
    raising = {}
    # Each call's arguments as it began, by frame. The frames are kept alive, so that no later
    # frame reuses an id.
    begun = {}
    # Each call's number, by frame, in the order the calls began: the main program's is 0.
    numbers = {}
    # The generators paused at a yield, by frame: each keeps its place and its names until it is
    # asked for its next value. And the numbers of those just asked, whose next step says so.
    paused = {}
    resuming = set()

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != LEARNER_FILE:
            return None
        if event == "call":
            fc = frame.f_code
            if not fc.co_flags & 0x02 and fc.co_name != "<module>":
                # A class statement's body runs as a frame of its own, though it is not a call:
                # its lines are not stepped through, and the class appears once it is made.
                return None
            if id(frame) in begun:
                # A generator asked for its next value: the same call goes on after its yield,
                # with its names as it left them.
                paused.pop(id(frame), None)
                resuming.add(numbers[id(frame)])
                return tracer
            count = fc.co_argcount + fc.co_kwonlyargcount + bool(fc.co_flags & 0x04) + bool(fc.co_flags & 0x08)
            params = fc.co_varnames[:count]
            begun[id(frame)] = ", ".join(argument(frame.f_locals[p]) for p in params if p in frame.f_locals)
            numbers[id(frame)] = len(numbers)
            kept.append(frame)
            return tracer
        if event == "exception":
            raising[id(frame)] = arg[0].__name__
            return tracer
        if event in ("line", "return"):
            raised = raising.pop(id(frame), None)
            if len(steps) >= max_events:
                raise StepLimit()
            step = {"event": event, "line": frame.f_lineno, "stack": snapshot(frame),
                    "output": out.getvalue()[-4000:]}
            # A generator going on after its yield, at its first step since: usually a line of its
            # own, but a call it makes on the line of the yield comes first.
            for entry in step["stack"] if resuming else ():
                if entry.get("id") in resuming:
                    resuming.discard(entry["id"])
                    entry["resumed"] = True
            yielded = False
            if event == "return":
                value = f"{tag(arg)} ({text(arg)})" if _is_object(arg) else _plain(_safe_repr(arg))
                if raised:
                    step["raised"] = raised
                elif frame.f_code.co_flags & _CO_GENERATOR and _at_yield(frame):
                    # A yield: the generator hands out a value and pauses, to go on later.
                    step["yielded"] = value
                    yielded = True
                else:
                    step["returned"] = value
                    if frame.f_code.co_flags & _CO_GENERATOR:
                        # The end of a generator's body: the next that asked it raises StopIteration.
                        step["ended"] = True
            if paused:
                step["paused"] = [frame_entry(f) for f in sorted(paused.values(), key=lambda f: numbers.get(id(f), 0))]
            if event == "return":
                if yielded:
                    paused[id(frame)] = frame
                else:
                    paused.pop(id(frame), None)
            steps.append(step)
        return tracer

    try:
        compiled = compile(code, LEARNER_FILE, "exec")
    except SyntaxError as exc:
        return {"steps": [], "error": _describe(exc), "output": ""}
    with contextlib.redirect_stdout(out):
        sys.settrace(tracer)
        try:
            exec(compiled, ns)
        except BaseException as exc:  # noqa: BLE001
            error = _describe(exc)
        finally:
            sys.settrace(None)
    return {"steps": steps, "error": error, "output": out.getvalue()[-4000:]}


# Expressions, checked with SymPy -------------------------------------------------


_LOG10 = None


def _log10():
    """A base-10 logarithm that keeps its shape, so answers print as log10."""
    global _LOG10
    if _LOG10 is not None:
        return _LOG10
    import sympy
    from sympy.core.evalf import prec_to_dps

    class log10(sympy.Function):  # noqa: N801 - the name learners type
        @classmethod
        def eval(cls, arg):
            if arg.is_Rational and arg.is_positive:
                value = sympy.log(arg, 10)
                if value.is_Rational:
                    return value
            return None

        def _eval_evalf(self, prec):
            return (sympy.log(self.args[0]) / sympy.log(10)).evalf(prec_to_dps(prec))

        def _eval_is_real(self):
            return self.args[0].is_positive

        def _latex(self, printer):
            return r"\log_{10}\left(%s\right)" % printer._print(self.args[0])

    _LOG10 = log10
    return log10


def _sympy_env(symbols):
    import sympy

    table = {}
    for spec in symbols:
        assumptions = {}
        if spec.get("positive"):
            assumptions["positive"] = True
        if spec.get("integer"):
            assumptions["integer"] = True
        table[spec["name"]] = sympy.Symbol(spec["name"], **assumptions)
    names = {
        "sqrt": sympy.sqrt,
        "exp": sympy.exp,
        "log": sympy.log,
        "ln": sympy.log,
        "log10": _log10(),
        "log2": lambda x: sympy.log(x, 2),
        "sin": sympy.sin,
        "cos": sympy.cos,
        "tan": sympy.tan,
        "pi": sympy.pi,
        "e": sympy.E,
        "E": sympy.E,
        "abs": sympy.Abs,
        "Abs": sympy.Abs,
        "factorial": sympy.factorial,
        "binomial": sympy.binomial,
        "Rational": sympy.Rational,
    }
    names.update(table)
    # SymPy's own one-letter names (S, N, O, Q and I) would be read as its objects. As letters they
    # are reported like any other undeclared name, unless the exercise declares them.
    for letter in ("S", "N", "O", "Q", "I"):
        names.setdefault(letter, sympy.Symbol(letter))
    return table, names


# Greek letters as they may be typed, and the names that exercises give their symbols.
_GREEK = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon", "ϵ": "epsilon",
    "η": "eta", "θ": "theta", "λ": "lamda", "μ": "mu", "ρ": "rho", "σ": "sigma", "τ": "tau",
    "φ": "phi", "ϕ": "phi", "ω": "omega",
}


# The functions an answer may name. A power written straight after one, as cos^2(x) is written on
# paper, is a power of the function's value, cos(x)^2. A negative power there is refused, since
# sin^-1(x) is written for the function that undoes the sine as often as for one over the sine.
_FUNCTION_NAMES = ("sqrt", "exp", "log10", "log2", "log", "ln", "sin", "cos", "tan", "abs", "Abs", "factorial", "binomial")


class _NegativeFunctionPower(ValueError):
    def __init__(self, name):
        super().__init__(name)
        self.name = name


def _refuse_negative_function_power(text):
    import re

    m = re.search(r"\b(" + "|".join(_FUNCTION_NAMES) + r")\s*(?:\^|\*\*)\s*\(?\s*-", text)
    if m:
        raise _NegativeFunctionPower(m.group(1))


def _parse(text, names, evaluate=True):
    import sympy
    from sympy.parsing.sympy_parser import (
        convert_xor,
        function_exponentiation,
        implicit_application,
        implicit_multiplication,
        parse_expr,
        split_symbols_custom,
        standard_transformations,
    )

    # A run of the step's own one-letter symbols, such as nL, is their product, as on paper.
    # Other names are left whole, so a typo is still reported rather than misread.
    letters = {k for k, v in names.items() if len(k) == 1 and isinstance(v, sympy.Symbol)}

    def is_product(name):
        return len(name) > 1 and name not in names and all(ch in letters for ch in name)

    # ^ becomes ** first, so that the later steps read cos^2(x) and cos^2 x as powers of cos(x).
    transformations = standard_transformations + (
        convert_xor,
        split_symbols_custom(is_product),
        implicit_multiplication,
        implicit_application,
        function_exponentiation,
    )
    cleaned = (
        text.replace("×", "*").replace("·", "*").replace("−", "-").replace("÷", "/").strip()
    )
    _refuse_negative_function_power(cleaned)
    # β typed as itself stands for the step's beta, when the step has one; spaces keep 2β and βk
    # products, as 2 beta and beta k.
    for letter, word in _GREEK.items():
        if letter in cleaned and word in names:
            cleaned = cleaned.replace(letter, f" {word} ").strip()
    return parse_expr(cleaned, local_dict=dict(names), transformations=transformations,
                      evaluate=evaluate)


def _unevaluated(text, names):
    """The answer read as typed, without SymPy's own rearranging, or None if it cannot be."""
    try:
        return _parse(text, names, evaluate=False)
    except Exception:  # noqa: BLE001 - the evaluated parse is still checked
        return None


def _read_as(text, names, expr):
    """LaTeX for the answer as the learner wrote it, so the brackets shown are the ones typed."""
    import re

    import sympy

    try:
        shown = sympy.latex(_parse(text, names, evaluate=False), order="none")
    except Exception:  # noqa: BLE001 - fall back to the evaluated form
        return sympy.latex(expr)
    # An unevaluated parse spells a leading minus as (-1) times, and 1/2 x as 1 times a half.
    shown = re.sub(r"(^|\{)\\left\(-1\\right\) ", r"\1-", shown)
    shown = re.sub(r"(?<![\d.])1 \\cdot ", "", shown)
    # 1/(1 - r) comes out as 1 times a fraction, which reads like a mixed number.
    return re.sub(r"(?<![\d.])1 \\frac\{1\}", r"\\frac{1}", shown)


def _undefined_names(expr, table):
    import sympy
    from sympy.core.function import AppliedUndef

    allowed = set(table.values())
    names = sorted(str(s) for s in expr.free_symbols if s not in allowed)
    names += sorted({str(f.func) for f in expr.atoms(AppliedUndef)})
    return names


def evaluate_at(expr, table, point, digits=30):
    import sympy

    subs = {table[name]: sympy.Rational(value) for name, value in point.items() if name in table}
    # The factorial of a negative whole number is undefined. SymPy makes it complex infinity, and
    # a quotient by that comes out as 0, so n!/(n - k)! would look like 0 wherever k > n. Such a
    # point is left out of the check instead.
    for f in expr.atoms(sympy.factorial):
        arg = f.args[0].subs(subs)
        if arg.is_integer and arg.is_negative:
            return None
    value = sympy.N(expr.subs(subs), digits)
    if value.has(sympy.zoo, sympy.oo, -sympy.oo, sympy.nan) or not value.is_number:
        return None
    if value.is_real is False:
        return None
    return value


def _contains(expr, pattern):
    import sympy

    for sub in sympy.preorder_traversal(expr):
        if sub == pattern:
            return True
    return False


def _is_completed_square(expr, x):
    """True when x appears only inside one squared bracket that is linear in x: a(x - h)^2 + k."""
    import sympy

    with_x = [t for t in sympy.Add.make_args(expr) if t.has(x)]
    if len(with_x) != 1:
        return False
    coeff, rest = with_x[0].as_independent(x, as_Add=False)
    if coeff.has(x) or not (rest.is_Pow and rest.exp == 2):
        return False
    base = rest.base
    return base.is_polynomial(x) and sympy.degree(base, x) == 1


def _multiplies_a_sum(raw):
    """True when the answer as written still has a bracketed sum multiplied or raised to a power.

    SymPy multiplies a number into a sum as it reads it, so 3*(2*x + 1) arrives as 6*x + 3 and
    looks expanded. The answer as typed, read without evaluating, still shows the bracket. A
    minus sign in front of the whole answer, as in -(x + 1), is multiplied in even then, so it
    passes; a bracket that is taken away, as in 5 - (x + 1), reads as -1 times a sum and does not."""
    import sympy

    if raw is None:
        return False
    for sub in sympy.preorder_traversal(raw):
        if isinstance(sub, sympy.Mul) and any(isinstance(arg, sympy.Add) for arg in sub.args):
            return True
        if (isinstance(sub, sympy.Pow) and isinstance(sub.base, sympy.Add)
                and sub.exp.is_Integer and sub.exp > 1):
            return True
    return False


def check_form(expr, form, names, raw=None):
    """Returns a message when the expression has the wrong shape, else None.

    raw is the answer read without evaluating, when there is one, for the checks that care
    about the brackets as typed."""
    import sympy

    message = form.get("message")
    if form.get("expanded") and (sympy.expand(expr) != expr or _multiplies_a_sum(raw)):
        return message or "That is equal, but this step asks for the expanded form."
    if form.get("factored") and sympy.factor(expr) != expr:
        return message or "That is equal, but this step asks for the factored form."
    if form.get("polynomial") and not expr.is_polynomial(*expr.free_symbols):
        return message or "That is equal, but it still divides by a letter. Simplify the fraction away."
    square = form.get("completedSquare")
    if square and not _is_completed_square(expr, names.get(square, sympy.Symbol(square))):
        return message or "That is equal, but it is not yet a number times a squared bracket, plus a number."
    for text in form.get("forbid") or []:
        if _contains(expr, _parse(text, names)):
            return message or "That is equal, but it has not taken this step yet."
    for text in form.get("require") or []:
        if not _contains(expr, _parse(text, names)):
            return message or "That is equal, but it is not yet in the form this step asks for."
    # Counted on the answer as typed where it parses, since SymPy's own tidying would cancel a
    # factor that the learner never cancelled.
    max_ops = form.get("maxOps")
    if max_ops is not None and sympy.count_ops(raw if raw is not None else expr) > max_ops:
        return message or "That is equal, but it can be written more simply."
    return None


def _different_message(payload, table, expr):
    """Says when an answer is the right expression times a pure number, which units cannot see."""
    import sympy

    plain = "That is not equal to the expression this step needs."
    ratios = []
    for point, expected_text in zip(payload["points"], payload["values"]):
        got = evaluate_at(expr, table, point)
        expected = sympy.Float(expected_text, 30)
        # is_zero, not == 0: SymPy no longer counts Float(0) as equal to the integer 0.
        if got is None or expected.is_zero:
            return plain
        ratios.append(got / expected)
    if len(ratios) < 2 or ratios[0].is_zero:
        return plain
    first = ratios[0]
    if all(abs(r - first) <= sympy.Float("1e-9") * abs(first) for r in ratios):
        return ("That differs from what this step needs only by a constant factor. Check any pure"
                " number in front, and any sign.")
    return plain


def check_expression(payload):
    import sympy

    table, names = _sympy_env(payload.get("symbols", []))
    text = payload.get("input", "")
    if not text.strip():
        return {"status": "empty", "message": "Write an expression first."}
    try:
        expr = _parse(text, names)
    except _NegativeFunctionPower as exc:
        f = exc.name
        return {"status": "unparsed",
                "message": f"{f}^-1 can mean one over {f} or the function that undoes {f}, so a power with a minus"
                           f" sign straight after {f} is not read. For one over {f}(x), write 1/{f}(x)."}
    except Exception:  # noqa: BLE001 - any parse failure is the learner's to fix
        return {"status": "unparsed",
                "message": "That could not be read as an expression. Check the brackets and operators."}
    if not isinstance(expr, sympy.Basic):
        try:
            expr = sympy.sympify(expr)
        except Exception:  # noqa: BLE001 - a name that is not an expression, such as a function
            return {"status": "unparsed",
                    "message": "That could not be read as an expression. Check the brackets and operators."}
    shown = _read_as(text, names, expr)
    unknown = _undefined_names(expr, table)
    if unknown:
        allowed = ", ".join(sorted(table)) or "no letters"
        return {"status": "unknown-names", "latex": shown,
                "message": f"This step uses only {allowed}, but your answer has {', '.join(unknown)}."
                           " Write products with * if you meant a product."}
    for point, expected_text in zip(payload["points"], payload["values"]):
        got = evaluate_at(expr, table, point)
        expected = sympy.Float(expected_text, 30)
        if got is None or abs(got - expected) > sympy.Float("1e-9") * max(1, abs(expected)):
            return {"status": "different", "latex": shown,
                    "message": _different_message(payload, table, expr)}
    shape = check_form(expr, payload.get("form") or {}, names, _unevaluated(text, names))
    if shape:
        return {"status": "form", "latex": shown, "message": shape}
    return {"status": "correct", "latex": shown}


def fingerprint(payload):
    """Values of a reference expression at seeded points (used by the checks)."""
    import random

    import sympy

    table, names = _sympy_env(payload.get("symbols", []))
    expr = _parse(payload["reference"], names)
    rng = random.Random(payload["seed"])
    wanted = int(payload.get("count", 6))
    points, values = [], []
    attempts = 0
    while len(points) < wanted and attempts < 500:
        attempts += 1
        point = {}
        for spec in payload.get("symbols", []):
            if spec.get("integer"):
                n = rng.randint(1, 9)
                point[spec["name"]] = str(n if spec.get("positive") else n * rng.choice([1, -1]))
            else:
                p, q = rng.randint(1, 40), rng.randint(1, 7)
                sign = 1 if spec.get("positive") else rng.choice([1, -1])
                point[spec["name"]] = str(sympy.Rational(sign * p, q))
        # A point drawn twice checks nothing new, so whole-number letters are checked at distinct values.
        if point in points:
            continue
        value = evaluate_at(expr, table, point)
        if value is None:
            continue
        points.append(point)
        values.append(str(sympy.N(value, 20)))
    if len(points) < wanted:
        raise ValueError("Could not find enough points where the reference is defined.")
    shape = check_form(expr, payload.get("form") or {}, names,
                       _unevaluated(payload["reference"], names))
    unknown = _undefined_names(expr, table)
    return {"points": points, "values": values, "formMessage": shape, "unknown": unknown,
            "latex": sympy.latex(expr)}


def run_json(text):
    return json.dumps(run(json.loads(text)))


def breakit_json(text):
    return json.dumps(breakit(json.loads(text)))


def trace_json(text):
    return json.dumps(trace(json.loads(text)))


def check_expression_json(text):
    return json.dumps(check_expression(json.loads(text)))


def fingerprint_json(text):
    return json.dumps(fingerprint(json.loads(text)))


def static_check(code):
    """Parses code without running it; used to report syntax errors early."""
    try:
        ast.parse(code, LEARNER_FILE)
        return json.dumps({"ok": True})
    except SyntaxError as exc:
        return json.dumps({"ok": False, "error": _describe(exc)})
