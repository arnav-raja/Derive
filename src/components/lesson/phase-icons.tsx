import type { ComponentType, SVGProps } from "react";

import { CodeIcon, DeriveIcon, ExplainIcon, ExploreIcon, PuzzleIcon, RecallIcon } from "@/components/ui/icons";
import type { PhaseId } from "@/lib/store/types";

/** One glyph for each of the six phases, used wherever a phase is drawn. */
export const PHASE_ICONS: Record<PhaseId, ComponentType<SVGProps<SVGSVGElement> & { title?: string }>> = {
  puzzle: PuzzleIcon,
  recall: RecallIcon,
  explore: ExploreIcon,
  derive: DeriveIcon,
  build: CodeIcon,
  explain: ExplainIcon,
};
