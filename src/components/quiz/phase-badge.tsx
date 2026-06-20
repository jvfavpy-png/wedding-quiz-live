import { Badge } from "@/components/ui/badge";
import { phaseLabel } from "@/lib/utils";
import type { Phase } from "@/types/quiz";

interface PhaseBadgeProps {
  phase: Phase;
  large?: boolean;
}

export function PhaseBadge({ phase, large = false }: PhaseBadgeProps) {
  const tone =
    phase === "question"
      ? "green"
      : phase === "closed"
        ? "red"
        : phase === "answer"
          ? "gold"
          : phase === "ranking"
            ? "pink"
            : phase === "finished"
              ? "navy"
              : "gray";

  return (
    <Badge tone={tone} className={large ? "min-h-12 px-5 text-lg" : undefined}>
      {phaseLabel(phase)}
    </Badge>
  );
}
