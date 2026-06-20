import { difficultyLabels } from "@/lib/question-settings";
import type { PublicQuestion } from "@/types/quiz";

export function QuestionScoreBadges({
  question,
  large = false,
  showDifficulty = true,
  showSpeedBonus = true,
}: {
  question: Pick<PublicQuestion, "difficulty" | "basePoints" | "speedBonusEnabled">;
  large?: boolean;
  showDifficulty?: boolean;
  showSpeedBonus?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showDifficulty ? (
        <span
          className={[
            "rounded-full bg-[#fff6d8] font-black text-[#6d4b00]",
            large ? "px-4 py-2 text-2xl" : "px-3 py-1 text-xs",
          ].join(" ")}
        >
          {difficultyLabels[question.difficulty]}
        </span>
      ) : null}
      <span
        className={[
          "rounded-full bg-[#13294b] font-black text-white",
          large ? "px-4 py-2 text-2xl" : "px-3 py-1 text-xs",
        ].join(" ")}
      >
        {question.basePoints}点問題
      </span>
      {showSpeedBonus && !question.speedBonusEnabled ? (
        <span
          className={[
            "rounded-full bg-slate-100 font-black text-slate-700",
            large ? "px-4 py-2 text-xl" : "px-3 py-1 text-xs",
          ].join(" ")}
        >
          速度ボーナスなし
        </span>
      ) : null}
    </div>
  );
}
