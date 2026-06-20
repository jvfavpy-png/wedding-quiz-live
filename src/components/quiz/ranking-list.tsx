import { Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankingEntry } from "@/types/quiz";

interface RankingListProps {
  ranking: RankingEntry[];
  currentParticipantId?: string;
  limit?: number;
  screen?: boolean;
}

export function RankingList({
  ranking,
  currentParticipantId,
  limit,
  screen = false,
}: RankingListProps) {
  const rows = typeof limit === "number" ? ranking.slice(0, limit) : ranking;

  if (rows.length === 0) {
    return <p className="text-sm font-bold text-slate-500">ランキングはまだ表示されていません。</p>;
  }

  return (
    <ol className="space-y-3">
      {rows.map((entry) => {
        const highlighted = currentParticipantId === entry.participantId;
        const podium = entry.rank <= 3;
        const first = entry.rank === 1;

        return (
          <li
            key={entry.participantId}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3",
              highlighted ? "border-[#ff6f91] bg-[#fff0f5]" : "border-white/75 bg-white/80",
              podium ? "border-[#d9b56d]/60 bg-[#fffaf2] shadow-lg shadow-[#d9b56d]/20" : undefined,
              first && screen ? "min-h-24 px-7" : undefined,
              screen && !first ? "min-h-16 px-5" : undefined,
            )}
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full font-black",
                podium ? "bg-[#ffe7a3] text-[#6d4b00]" : "bg-slate-100 text-slate-700",
                first && screen ? "size-20 text-4xl" : undefined,
                screen && !first ? "size-14 text-2xl" : "text-base",
              )}
            >
              {first ? (
                <Trophy className={cn(screen ? "size-10" : "size-6")} aria-label="1位" />
              ) : podium ? (
                <Medal className="size-6" aria-label={`${entry.rank}位`} />
              ) : (
                entry.rank
              )}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate font-black text-[#13294b]",
                  first && screen ? "text-5xl" : undefined,
                  screen && !first ? "text-3xl" : "text-base",
                )}
              >
                {entry.rank}位 {entry.name}
              </p>
              {highlighted ? <p className="text-xs font-bold text-[#9f1239]">あなたです</p> : null}
            </div>
            <p className={cn("font-black text-[#13294b]", first && screen ? "text-6xl" : screen ? "text-4xl" : "text-xl")}>
              {entry.score}点
            </p>
          </li>
        );
      })}
    </ol>
  );
}
