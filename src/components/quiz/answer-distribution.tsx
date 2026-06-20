import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import type { AnswerDistribution } from "@/types/quiz";

interface AnswerDistributionProps {
  distribution: AnswerDistribution | null;
  showCorrect?: boolean;
  screen?: boolean;
}

export function AnswerDistributionChart({
  distribution,
  showCorrect = false,
  screen = false,
}: AnswerDistributionProps) {
  if (!distribution || distribution.options.length === 0) {
    return <p className="text-sm font-bold text-slate-500">回答分布はまだありません。</p>;
  }

  const max = Math.max(1, ...distribution.counts);

  return (
    <div className="space-y-3">
      {distribution.options.map((option, index) => {
        const count = distribution.counts[index] ?? 0;
        const isCorrect = showCorrect && distribution.correctIndex === index;

        return (
          <div
            key={`${option}-${index}`}
            className={cn(
              "rounded-xl border bg-white/75 p-3",
              isCorrect ? "border-[#e0a126] bg-[#fff6d8]" : "border-slate-200",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p
                className={cn(
                  "font-black text-[#13294b]",
                  screen ? "text-2xl" : "text-sm sm:text-base",
                )}
              >
                {String.fromCharCode(65 + index)}. {option}
              </p>
              <p className={cn("font-black text-[#13294b]", screen ? "text-3xl" : "text-lg")}>
                {count}
              </p>
            </div>
            <ProgressBar value={count} max={max} className={screen ? "h-5" : "h-3"} />
          </div>
        );
      })}
      <p className={cn("font-bold text-slate-600", screen ? "text-xl" : "text-sm")}>
        回答数 {distribution.total}
      </p>
    </div>
  );
}
