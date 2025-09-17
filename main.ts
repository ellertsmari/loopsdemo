type LoopPart = "start" | "condition" | "step" | "body";
type LessonKey = "for" | "while" | "foreach";
type Comparator = "<=" | ">=";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

interface PartInfo {
  label: string;
  detail: string;
  sentence: string;
}

interface CounterConfig {
  variable: string;
  start: number;
  comparator: Comparator;
  end: number;
  step: number;
  values: number[];
  nextValue: number;
  message: string;
}

interface ForEachConfig {
  values: number[];
  message: string;
}

interface CounterParse {
  config: CounterConfig;
  texts: Record<LoopPart, string>;
}

interface ForEachParse {
  config: ForEachConfig;
  texts: Record<LoopPart, string>;
}

interface LessonEvent {
  highlight: LoopPart | null;
  trace?: string;
  console?: string;
  counter?: string;
}

interface LessonData {
  events: LessonEvent[];
  traceLines: string[];
  consoleLines: string[];
  finalCounter: string;
}

const lessonOrder: LoopPart[] = ["start", "condition", "step", "body"];

const lessonInfo: Record<LessonKey, Record<LoopPart, PartInfo>> = {
  for: {
    start: {
      label: "Start",
      detail: "Declare the counter once at the beginning.",
      sentence: "Example: let i = 1 begins counting at 1.",
    },
    condition: {
      label: "Condition",
      detail: "Keep looping while this comparison stays true.",
      sentence: "Example: i <= 5 keeps looping while i is 5 or smaller.",
    },
    step: {
      label: "Move",
      detail: "Update the counter after each run.",
      sentence: "Example: i = i + 1 adds one before the next check.",
    },
    body: {
      label: "Body",
      detail: "Write the work that should repeat inside the braces.",
      sentence: "Example: console.log(...) uses the current value.",
    },
  },
  while: {
    start: {
      label: "Setup",
      detail: "Prepare the counter before the loop begins.",
      sentence: "Example: let i = 1; sets the first value.",
    },
    condition: {
      label: "Condition",
      detail: "Check at the top. If it is false we never enter the body.",
      sentence: "Example: i <= 5 keeps looping while i is small enough.",
    },
    step: {
      label: "Move",
      detail: "Update the counter inside the loop so the condition changes.",
      sentence: "Example: i = i + 1; nudges i toward the exit.",
    },
    body: {
      label: "Body",
      detail: "Do the repeated work between the braces.",
      sentence: "Example: console.log(...) shows progress each run.",
    },
  },
  foreach: {
    start: {
      label: "Start",
      detail: "Choose the array for forEach to visit.",
      sentence: "Example: const values = [2, 4, 6]; sets the data.",
    },
    condition: {
      label: "Condition",
      detail: "forEach keeps calling your function until the array ends.",
      sentence: "JavaScript handles the counting automatically.",
    },
    step: {
      label: "Move",
      detail: "Moving forward happens after your callback runs once.",
      sentence: "No extra line is required; JavaScript handles it.",
    },
    body: {
      label: "Body",
      detail: "Describe what should happen for each value.",
      sentence: "Example: console.log(...) uses the current item.",
    },
  },
};

const defaultText: Record<LessonKey, Record<LoopPart, string>> = {
  for: {
    start: "let i = 1",
    condition: "i <= 5",
    step: "i = i + 1",
    body: "console.log(\"Looping is learning\", i);",
  },
  while: {
    start: "let i = 1;",
    condition: "i <= 5",
    step: "i = i + 1;",
    body: "console.log(\"Looping is learning\", i);",
  },
  foreach: {
    start: "const values = [2, 4, 6];",
    condition: "values.forEach((value, index) => {",
    step: "// forEach moves to the next item automatically",
    body: "console.log(\"Value\", index, value);",
  },
};

const initialConsole: Record<LessonKey, string> = {
  for: "Console output (like DevTools) will appear here.",
  while: "Console output (like DevTools) will appear here.",
  foreach: "Console output (like DevTools) will appear here.",
};

const initialTrace: Record<LessonKey, string> = {
  for: "Trace will explain each part of the loop.",
  while: "Trace will explain each part of the loop.",
  foreach: "Trace will explain each part of the loop.",
};

function initialCounterText(lesson: LessonKey) {
  if (lesson === "foreach") {
    return "index = -- (value --)";
  }
  return "Counter not started";
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error("Missing element with id #" + id);
  }
  return element as T;
}

const explainBoxes: Record<LessonKey, HTMLDivElement> = {
  for: requireElement<HTMLDivElement>("forExplain"),
  while: requireElement<HTMLDivElement>("whileExplain"),
  foreach: requireElement<HTMLDivElement>("forEachExplain"),
};

const animateButtons: Record<LessonKey, HTMLButtonElement> = {
  for: requireElement<HTMLButtonElement>("playFor"),
  while: requireElement<HTMLButtonElement>("playWhile"),
  foreach: requireElement<HTMLButtonElement>("playForEach"),
};

const runButtons: Record<LessonKey, HTMLButtonElement> = {
  for: requireElement<HTMLButtonElement>("runFor"),
  while: requireElement<HTMLButtonElement>("runWhile"),
  foreach: requireElement<HTMLButtonElement>("runForEach"),
};

const stepButtons: Record<LessonKey, HTMLButtonElement> = {
  for: requireElement<HTMLButtonElement>("stepFor"),
  while: requireElement<HTMLButtonElement>("stepWhile"),
  foreach: requireElement<HTMLButtonElement>("stepForEach"),
};

const nextButtons: Record<LessonKey, HTMLButtonElement> = {
  for: requireElement<HTMLButtonElement>("nextFor"),
  while: requireElement<HTMLButtonElement>("nextWhile"),
  foreach: requireElement<HTMLButtonElement>("nextForEach"),
};

const resetButtons: Record<LessonKey, HTMLButtonElement> = {
  for: requireElement<HTMLButtonElement>("resetFor"),
  while: requireElement<HTMLButtonElement>("resetWhile"),
  foreach: requireElement<HTMLButtonElement>("resetForEach"),
};

const consoles: Record<LessonKey, HTMLDivElement> = {
  for: requireElement<HTMLDivElement>("forConsole"),
  while: requireElement<HTMLDivElement>("whileConsole"),
  foreach: requireElement<HTMLDivElement>("forEachConsole"),
};

const traces: Record<LessonKey, HTMLDivElement> = {
  for: requireElement<HTMLDivElement>("forTrace"),
  while: requireElement<HTMLDivElement>("whileTrace"),
  foreach: requireElement<HTMLDivElement>("forEachTrace"),
};

const counters: Record<LessonKey, HTMLDivElement> = {
  for: requireElement<HTMLDivElement>("forCounter"),
  while: requireElement<HTMLDivElement>("whileCounter"),
  foreach: requireElement<HTMLDivElement>("forEachCounter"),
};

function setNextEnabled(active: LessonKey | null, enabled = true) {
  lessons.forEach((lesson) => {
    nextButtons[lesson].disabled = !(enabled && lesson === active);
  });
}

const highlightSpans = new Map<LessonKey, Map<LoopPart, HTMLSpanElement[]>>();
const editableSpans = new Map<LessonKey, Map<LoopPart, HTMLSpanElement>>();

document
  .querySelectorAll<HTMLSpanElement>("[data-lesson][data-part]")
  .forEach((span) => {
    const lesson = span.dataset.lesson as LessonKey | undefined;
    const part = span.dataset.part as LoopPart | undefined;
    if (!lesson || !part || !lessonOrder.includes(part)) {
      return;
    }
    const byPart = highlightSpans.get(lesson) ?? new Map<LoopPart, HTMLSpanElement[]>();
    const list = byPart.get(part) ?? [];
    list.push(span);
    byPart.set(part, list);
    highlightSpans.set(lesson, byPart);

    const editableByPart = editableSpans.get(lesson) ?? new Map<LoopPart, HTMLSpanElement>();
    editableByPart.set(part, span);
    editableSpans.set(lesson, editableByPart);

    span.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
      }
    });

    span.addEventListener("input", () => {
      stopStepping();
      sanitiseSpan(span);
    });
  });

const lessons: LessonKey[] = ["for", "while", "foreach"];
const activeParts = new Map<LessonKey, LoopPart | undefined>();
const animationFlags = new Map<LessonKey, boolean>();

let stepLesson: LessonKey | null = null;
let stepEvents: LessonEvent[] = [];
let stepIndex = 0;
let stepTrace: string[] = [];
let stepConsole: string[] = [];

lessons.forEach((lesson) => {
  resetLesson(lesson);
  renderExplanation(lesson);
  setActivePart(lesson);
});

lessons.forEach((lesson) => {
  animateButtons[lesson].addEventListener("click", () => {
    void animateLesson(lesson);
  });

  runButtons[lesson].addEventListener("click", () => {
    runLesson(lesson);
  });

  stepButtons[lesson].addEventListener("click", () => {
    stepThroughLesson(lesson);
  });

  nextButtons[lesson].addEventListener("click", () => {
    advanceStep(lesson);
  });

  resetButtons[lesson].addEventListener("click", () => {
    resetLesson(lesson);
  });

  explainBoxes[lesson].addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const candidate = target?.closest<HTMLElement>("[data-part]");
    if (!candidate) {
      return;
    }
    const part = candidate.dataset.part as LoopPart | undefined;
    if (part && lessonOrder.includes(part)) {
      stopStepping();
      setActivePart(lesson, part);
    }
  });
});

function resetLesson(lesson: LessonKey) {
  stopStepping();
  const defaults = defaultText[lesson];
  const parts = editableSpans.get(lesson);
  if (parts) {
    lessonOrder.forEach((part) => {
      const span = parts.get(part);
      if (span) {
        span.textContent = defaults[part];
      }
    });
  }
  setActivePart(lesson);
  consoles[lesson].textContent = initialConsole[lesson];
  traces[lesson].textContent = initialTrace[lesson];
  counters[lesson].textContent = initialCounterText(lesson);
}

function sanitiseSpan(span: HTMLSpanElement) {
  const text = span.textContent ?? "";
  const cleaned = text.replace(/\s+/g, (match) => (match.includes("\n") ? " " : match));
  if (cleaned !== text) {
    span.textContent = cleaned;
  }
}

function renderExplanation(lesson: LessonKey) {
  const container = explainBoxes[lesson];
  const active = activeParts.get(lesson);
  const info = lessonInfo[lesson];
  const fragments = lessonOrder.map((part) => {
    const partInfo = info[part];
    const isActive = part === active ? " active" : "";
    return (
      '<div class="explain-item' +
      isActive +
      '" data-lesson="' +
      lesson +
      '" data-part="' +
      part +
      '\">' +
      "<strong>" +
      partInfo.label +
      "</strong>" +
      "<p>" +
      partInfo.detail +
      "</p>" +
      "<p>" +
      partInfo.sentence +
      "</p>" +
      "</div>"
    );
  });
  container.innerHTML = fragments.join("");
}

function setActivePart(lesson: LessonKey, part?: LoopPart | null) {
  activeParts.set(lesson, part ?? undefined);
  const spansByPart = highlightSpans.get(lesson);
  if (spansByPart) {
    spansByPart.forEach((spans, key) => {
      spans.forEach((span) => {
        span.classList.toggle("active", part === key);
      });
    });
  }
  renderExplanation(lesson);
}

function animateLesson(lesson: LessonKey) {
  if (animationFlags.get(lesson)) {
    return;
  }
  animationFlags.set(lesson, true);
  (async () => {
    for (const part of lessonOrder) {
      setActivePart(lesson, part);
      await wait(650);
    }
    setActivePart(lesson);
    animationFlags.set(lesson, false);
  })().catch(() => {
    animationFlags.set(lesson, false);
  });
}

function runLesson(lesson: LessonKey) {
  stopStepping();
  const result = collectLessonData(lesson);
  if (result.ok === false) {
    showError(lesson, result.error);
    return;
  }
  const data = result.value;
  setActivePart(lesson);
  setNextEnabled(null, false);
  counters[lesson].textContent = data.finalCounter;
  traces[lesson].textContent = data.traceLines.length
    ? data.traceLines.join("\n")
    : "Trace: condition was false, so the body never ran.";
  consoles[lesson].textContent = data.consoleLines.length
    ? data.consoleLines.join("\n")
    : "Console: nothing was logged.";
}

function stepThroughLesson(lesson: LessonKey) {
  stopStepping();
  const result = collectLessonData(lesson);
  if (result.ok === false) {
    showError(lesson, result.error);
    return;
  }
  const data = result.value;
  stepLesson = lesson;
  stepEvents = data.events;
  stepIndex = 0;
  stepTrace = [];
  stepConsole = [];
  setActivePart(lesson);
  traces[lesson].textContent = stepEvents.length
    ? "Click Next step to begin."
    : "Nothing to show.";
  consoles[lesson].textContent = initialConsole[lesson];
  counters[lesson].textContent = initialCounterText(lesson);
  if (!stepEvents.length) {
    counters[lesson].textContent = data.finalCounter;
    setNextEnabled(null, false);
    stepLesson = null;
    return;
  }
  setNextEnabled(lesson, true);
}

function processStepEvent(lesson: LessonKey, event: LessonEvent) {
  if (event.highlight !== undefined) {
    setActivePart(lesson, event.highlight);
  }
  if (event.counter) {
    counters[lesson].textContent = event.counter;
  }
  if (event.trace) {
    stepTrace.push(event.trace);
    traces[lesson].textContent = stepTrace.join("\n");
  }
  if (event.console) {
    stepConsole.push(event.console);
    consoles[lesson].textContent = stepConsole.join("\n");
  }
}

function advanceStep(lesson: LessonKey) {
  if (stepLesson !== lesson) {
    stepThroughLesson(lesson);
    return;
  }
  if (stepIndex >= stepEvents.length) {
    setNextEnabled(null, false);
    return;
  }
  processStepEvent(lesson, stepEvents[stepIndex]);
  stepIndex += 1;
  if (stepIndex >= stepEvents.length) {
    stopStepping();
  }
}

function stopStepping() {
  if (stepLesson) {
    setActivePart(stepLesson);
  }
  setNextEnabled(null, false);
  stepLesson = null;
  stepEvents = [];
  stepIndex = 0;
  stepTrace = [];
  stepConsole = [];
}

function collectLessonData(lesson: LessonKey): ParseResult<LessonData> {
  if (lesson === "foreach") {
    const parseResult = parseForEachConfig();
    if (parseResult.ok === false) {
      return parseResult;
    }
    return { ok: true, value: buildForEachLessonData(parseResult.value) };
  }
  const parseResult = parseCounterConfig(lesson);
  if (parseResult.ok === false) {
    return parseResult;
  }
  return { ok: true, value: buildCounterLessonData(lesson, parseResult.value) };
}

function parseCounterConfig(lesson: LessonKey): ParseResult<CounterParse> {
  const parts = editableSpans.get(lesson);
  if (!parts) {
    return { ok: false, error: "Missing editable parts." };
  }

  const startText = getSpanText(parts.get("start"));
  const conditionText = getSpanText(parts.get("condition"));
  const stepText = getSpanText(parts.get("step"));
  const bodyText = getSpanText(parts.get("body"));

  const startMatch = startText
    .replace(/;$/, "")
    .match(/^(?:let|const|var)?\s*([a-zA-Z_$][\w$]*)\s*=\s*(-?\d+)$/);
  if (!startMatch) {
    return { ok: false, error: "Could not read the starting value. Keep it like let i = 1." };
  }
  const variable = startMatch[1];
  const startValue = Number(startMatch[2]);

  const conditionPattern = new RegExp(
    "^" + variable + "\\s*(<=|>=)\\s*(-?\\d+)$"
  );
  const conditionMatch = conditionText.replace(/;$/, "").match(conditionPattern);
  if (!conditionMatch) {
    return {
      ok: false,
      error: "Could not read the condition. Keep it like " + variable + " <= 5.",
    };
  }
  const comparator = conditionMatch[1] as Comparator;
  const endValue = Number(conditionMatch[2]);

  const stepPattern = new RegExp(
    "^" + variable + "\\s*=\\s*" + variable + "\\s*([+-])\\s*(\\d+)$"
  );
  const stepMatch = stepText.replace(/;$/, "").match(stepPattern);
  if (!stepMatch) {
    return {
      ok: false,
      error: "Could not read the step. Keep it like " + variable + " = " + variable + " + 1.",
    };
  }
  const stepDirection = stepMatch[1] === "+" ? 1 : -1;
  const magnitude = Number(stepMatch[2]);
  if (magnitude === 0) {
    return { ok: false, error: "The step must change the counter." };
  }
  const stepValue = stepDirection * magnitude;

  if (comparator === "<=" && stepValue <= 0) {
    return { ok: false, error: "A <= comparison needs a positive step." };
  }
  if (comparator === ">=" && stepValue >= 0) {
    return { ok: false, error: "A >= comparison needs a negative step." };
  }

  const valuesResult = deriveCounterValues(startValue, endValue, comparator, stepValue);
  if (valuesResult.ok === false) {
    return valuesResult;
  }

  const message = extractMessage(bodyText) ?? "Looping is learning";

  const config: CounterConfig = {
    variable,
    start: startValue,
    comparator,
    end: endValue,
    step: stepValue,
    values: valuesResult.value.values,
    nextValue: valuesResult.value.next,
    message,
  };

  return {
    ok: true,
    value: { config, texts: { start: startText, condition: conditionText, step: stepText, body: bodyText } },
  };
}

function parseForEachConfig(): ParseResult<ForEachParse> {
  const parts = editableSpans.get("foreach");
  if (!parts) {
    return { ok: false, error: "Missing editable parts." };
  }
  const arrayText = getSpanText(parts.get("start"));
  const bodyText = getSpanText(parts.get("body"));

  const arrayMatch = arrayText.match(/\[(.*)\]/);
  if (!arrayMatch) {
    return {
      ok: false,
      error: "Could not read the array. Keep it like const values = [1, 2, 3];",
    };
  }

  const rawItems = arrayMatch[1]
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (rawItems.length === 0) {
    return { ok: false, error: "Add at least one number to the array." };
  }

  const values: number[] = [];
  for (const item of rawItems) {
    const value = Number(item);
    if (!Number.isFinite(value)) {
      return {
        ok: false,
        error: "Only numbers are supported in this playground array.",
      };
    }
    values.push(value);
  }

  const message = extractMessage(bodyText) ?? "Value";

  const config: ForEachConfig = {
    values,
    message,
  };

  return { ok: true, value: { config, texts: { start: arrayText, condition: getSpanText(parts.get("condition")), step: getSpanText(parts.get("step")), body: bodyText } } };
}

function deriveCounterValues(
  start: number,
  end: number,
  comparator: Comparator,
  step: number
): ParseResult<{ values: number[]; next: number }> {
  const values: number[] = [];
  let current = start;
  let guard = 0;
  const check = comparator === "<=" ? (value: number) => value <= end : (value: number) => value >= end;

  while (check(current)) {
    values.push(current);
    current += step;
    guard += 1;
    if (guard > 200) {
      return { ok: false, error: "This loop would run too many times. Adjust the numbers." };
    }
  }

  return { ok: true, value: { values, next: current } };
}

function buildCounterLessonData(lesson: LessonKey, parse: CounterParse): LessonData {
  const { config, texts } = parse;
  const events: LessonEvent[] = [];
  const trace: string[] = [];
  const consoleLines: string[] = [];

  const startCounter = formatCounter(config.variable, config.start);
  const startLabel = lesson === "for" ? "Start" : "Setup";
  const startTrace = startLabel + ": " + texts.start.trim() + " -> " + startCounter;
  events.push({ highlight: "start", trace: startTrace, counter: startCounter });
  trace.push(startTrace);

  config.values.forEach((value, index) => {
    const iteration = index + 1;
    const conditionYes = true;
    const conditionTrace =
      "Check " +
      config.variable +
      " " +
      config.comparator +
      " " +
      config.end +
      " with " +
      config.variable +
      " = " +
      value +
      " -> " +
      (conditionYes ? "yes" : "no");
    events.push({ highlight: "condition", trace: conditionTrace, counter: formatCounter(config.variable, value) });
    trace.push(conditionTrace);

    const consoleLine = formatConsoleStatement(texts.body, { [config.variable]: String(value) });
    const bodyTrace = "Body (iteration " + iteration + "): run console.log with " + config.variable + " = " + value;
    events.push({ highlight: "body", trace: bodyTrace, console: consoleLine, counter: formatCounter(config.variable, value) });
    trace.push(bodyTrace);
    consoleLines.push(consoleLine);

    const next = value + config.step;
    const stepTrace = "Update: " + texts.step.trim() + " -> " + formatCounter(config.variable, next);
    events.push({ highlight: "step", trace: stepTrace, counter: formatCounter(config.variable, next) });
    trace.push(stepTrace);
  });

  const finalConditionTrace =
    "Check " +
    config.variable +
    " " +
    config.comparator +
    " " +
    config.end +
    " with " +
    config.variable +
    " = " +
    config.nextValue +
    " -> no";
  events.push({ highlight: "condition", trace: finalConditionTrace, counter: formatCounter(config.variable, config.nextValue) });
  trace.push(finalConditionTrace);

  events.push({ highlight: null, counter: formatCounter(config.variable, config.nextValue) });

  return {
    events,
    traceLines: trace,
    consoleLines,
    finalCounter: formatCounter(config.variable, config.nextValue),
  };
}

function buildForEachLessonData(parse: ForEachParse): LessonData {
  const { config, texts } = parse;
  const events: LessonEvent[] = [];
  const trace: string[] = [];
  const consoleLines: string[] = [];

  const startTrace = "Start: array has " + config.values.length + " item(s).";
  events.push({ highlight: "start", trace: startTrace, counter: formatForEachCounter(null) });
  trace.push(startTrace);

  config.values.forEach((value, index) => {
    const conditionTrace = "Check next item (index " + index + ") -> yes";
    events.push({
      highlight: "condition",
      trace: conditionTrace,
      counter: formatForEachCounter(index, value, config.values.length),
    });
    trace.push(conditionTrace);

    const consoleLine = formatConsoleStatement(texts.body, {
      value: String(value),
      index: String(index),
    });
    const bodyTrace = "Callback for index " + index + " with value " + value;
    events.push({
      highlight: "body",
      trace: bodyTrace,
      console: consoleLine,
      counter: formatForEachCounter(index, value, config.values.length),
    });
    trace.push(bodyTrace);
    consoleLines.push(consoleLine);

    const stepTrace = texts.step.trim() || "forEach moves to the next item.";
    events.push({
      highlight: "step",
      trace: stepTrace,
      counter: formatForEachCounter(index + 1, config.values[index + 1], config.values.length),
    });
    trace.push(stepTrace);
  });

  const finalTrace = "Check next item -> no (array finished).";
  events.push({
    highlight: "condition",
    trace: finalTrace,
    counter: formatForEachCounter(config.values.length, undefined, config.values.length),
  });
  trace.push(finalTrace);

  events.push({ highlight: null, counter: formatForEachCounter(config.values.length, undefined, config.values.length) });

  return {
    events,
    traceLines: trace,
    consoleLines,
    finalCounter: formatForEachCounter(config.values.length, undefined, config.values.length),
  };
}

function formatConsoleStatement(template: string, replacements: Record<string, string>): string {
  const trimmed = template.trim();
  if (!trimmed) {
    return "(no console output)";
  }
  const match = trimmed.match(/^console\.log\s*\((.*)\)\s*;?$/);
  if (!match) {
    return replaceIdentifiers(trimmed, replacements);
  }
  const args = splitArguments(match[1]);
  if (!args.length) {
    return "";
  }
  const evaluated = args.map((arg) => evaluateToken(arg, replacements)).filter((part) => part.length > 0);
  const output = evaluated.join(" ").trim();
  if (output.length === 0) {
    return replaceIdentifiers(trimmed, replacements);
  }
  return output;
}

function formatCounter(variable: string, value: number) {
  return variable + " = " + value;
}

function splitArguments(value: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      current += char;
      if (char === quote && value[i - 1] !== "\\") {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      if (depth > 0) {
        depth -= 1;
      }
      current += char;
      continue;
    }
    if (char === "," && depth === 0) {
      if (current.trim().length > 0) {
        args.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

function evaluateToken(token: string, replacements: Record<string, string>): string {
  const trimmed = token.trim();
  if (!trimmed) {
    return "";
  }
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1);
  }
  if (first === "`" && last === "`") {
    const inner = trimmed.slice(1, -1);
    return replaceIdentifiers(inner, replacements);
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed in replacements) {
    return replacements[trimmed];
  }
  const plusMatch = trimmed.match(/^([a-zA-Z_$][\w$]*)\s*([+-])\s*(-?\d+(?:\.\d+)?)$/);
  if (plusMatch) {
    const baseValue = replacements[plusMatch[1]] ?? plusMatch[1];
    const numericBase = Number(baseValue);
    if (Number.isFinite(numericBase)) {
      const modifier = Number(plusMatch[3]);
      const result = plusMatch[2] === "+" ? numericBase + modifier : numericBase - modifier;
      return String(result);
    }
  }
  return replaceIdentifiers(trimmed, replacements);
}

function replaceIdentifiers(value: string, replacements: Record<string, string>): string {
  let result = value;
  Object.entries(replacements).forEach(([token, replacement]) => {
    const pattern = new RegExp("\\b" + escapeRegExp(token) + "\\b", "g");
    result = result.replace(pattern, replacement);
  });
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatForEachCounter(index: number | null, value?: number, total?: number) {
  if (index === null) {
    return "index = -- (value --)";
  }
  if (total !== undefined && index >= total) {
    return "index = " + index + " (done)";
  }
  if (value === undefined) {
    return "index = " + index + " (waiting)";
  }
  return "index = " + index + " (value " + value + ")";
}

function extractMessage(body: string) {
  const match = body.match(/console\.log\((['"])(.*?)\1/);
  if (!match) {
    return null;
  }
  return match[2];
}

function getSpanText(span: HTMLSpanElement | undefined) {
  return (span?.textContent ?? "").trim();
}

function showError(lesson: LessonKey, message: string) {
  counters[lesson].textContent = initialCounterText(lesson);
  traces[lesson].textContent = "Problem: " + message;
  consoles[lesson].textContent = "Problem: " + message;
  setActivePart(lesson);
  setNextEnabled(null, false);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
