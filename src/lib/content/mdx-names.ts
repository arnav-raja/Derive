/**
 * The components a lesson's MDX may use. Lessons never import anything: every
 * component is provided by the lesson renderer (src/lib/content/mdx.tsx), and
 * the content check rejects any other capitalised tag.
 */
export const MDX_COMPONENT_NAMES = [
  // Exercises and gated content.
  "Exercise",
  "Reveal",
  "Reteach",
  "MixedCheck",
  // Prose structure.
  "Note",
  "Stated",
  "Definition",
  "Callback",
  "Foreshadow",
  "Sym",
  "Steps",
  "Step",
  "Figure",
  // Figures.
  "ScaleLine",
  "FunctionPlot",
  "ExpressionTree",
  "MappingDiagram",
  "ProgramTrace",
  "Staircase",
  "PartialSums",
  "FloatLine",
  "TextBytes",
  "SetDiagram",
  "QuantifierGrid",
  "TileGrid",
  "TieLists",
  "OrderedChoices",
  "PascalTriangle",
  "MergeLevels",
  "HashBuckets",
  "UnitCircle",
  "VectorPlane",
  "FourTriangles",
  "ShuffleBuffer",
  "ComplexPlane",
  "EulerSteps",
  "WordRanks",
  "NextWords",
] as const;

export type MdxComponentName = (typeof MDX_COMPONENT_NAMES)[number];
