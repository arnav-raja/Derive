/** The maths settings for lesson MDX and exercise Markdown alike. */
export const KATEX_OPTIONS = {
  // \htmlData{sym=x}{x} links a symbol in an equation to the same symbol in a figure.
  trust: (context: { command: string }) => context.command === "\\htmlData",
  // \sym{N}{N} is shorthand for \htmlData{sym=N}{N}.
  macros: { "\\sym": "\\htmlData{sym=#1}{#2}" },
  strict: "ignore" as const,
  output: "htmlAndMathml" as const,
  throwOnError: false,
};
