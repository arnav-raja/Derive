import type { ComponentType, SVGProps } from "react";

import { BugIcon, CodeIcon, DeriveIcon, ExplainIcon, ProofIcon, RecallIcon, RulerIcon, TargetIcon, WarningIcon } from "@/components/ui/icons";
import type { ExerciseKind } from "@/lib/content/exercise-schema";

/** A glyph for each kind of exercise, always shown beside its name. */
export const KIND_ICONS: Record<ExerciseKind, ComponentType<SVGProps<SVGSVGElement>>> = {
  predict: TargetIcon,
  recall: RecallIcon,
  step: DeriveIcon,
  proof: ProofIcon,
  build: CodeIcon,
  breakit: WarningIcon,
  estimate: RulerIcon,
  debug: BugIcon,
  explain: ExplainIcon,
};
