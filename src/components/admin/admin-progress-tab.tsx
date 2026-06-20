"use client";

import {
  CheckCircle2,
  Clipboard,
  Eye,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Trophy,
  Users,
} from "lucide-react";
import { phaseLabel } from "@/lib/utils";
import { AnswerDistributionChart } from "@/components/quiz/answer-distribution";
import { PhaseBadge } from "@/components/quiz/phase-badge";
import { QuestionScoreBadges } from "@/components/quiz/question-score-badges";
import { RankingList } from "@/components/quiz/ranking-list";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/admin/admin-room-shared";
import type {
  AdminAction,
  AdminQuestion,
  AnswerDistribution,
  Phase,
  RankingEntry,
} from "@/types/quiz";

export function AdminProgressTab({
  normalizedRoomCode,
  phase,
  participantCount,
  answeredCount,
  totalAnswerCount,
  scoredParticipantCount,
  hasRehearsalResults,
  selectedQuestion,
  questions,
  effectiveSelectedQuestionId,
  distribution,
  ranking,
  realtimeStatus,
  lastRefreshedLabel,
  busy,
  canStart,
  canClose,
  canReveal,
  canShowRanking,
  canReset,
  onSelectQuestion,
  onControl,
  onRefresh,
}: {
  normalizedRoomCode: string;
  phase: Phase;
  participantCount: number;
  answeredCount: number;
  totalAnswerCount: number;
  scoredParticipantCount: number;
  hasRehearsalResults: boolean;
  selectedQuestion: AdminQuestion | undefined;
  questions: AdminQuestion[];
  effectiveSelectedQuestionId: string | null;
  distribution: AnswerDistribution | null;
  ranking: RankingEntry[];
  realtimeStatus: string;
  lastRefreshedLabel: string;
  busy: string | null;
  canStart: boolean;
  canClose: boolean;
  canReveal: boolean;
  canShowRanking: boolean;
  canReset: boolean;
  onSelectQuestion: (questionId: string) => void;
  onControl: (action: AdminAction, questionId?: string) => Promise<void>;
  onRefresh: () => Promise<unknown>;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="grid content-start gap-5">
          <Card className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-500">roomCode</p>
                <h1 className="text-4xl font-black">{normalizedRoomCode}</h1>
              </div>
              <PhaseBadge phase={phase} large />
            </div>
            <CardTitle>本番進行</CardTitle>
            <p className="text-sm font-bold text-slate-600">
              次の操作: <span className="text-[#13294b]">{nextOperationLabel(phase)}</span>
            </p>
            <p className="text-sm font-bold leading-6 text-slate-600">
              {nextOperationDescription(phase)}
            </p>
            <div className="rounded-xl bg-[#fff6d8] p-3 text-sm font-black leading-6 text-[#6d4b00]">
              このタブは当日の進行専用です。問題編集、URL共有、設定変更は別タブに分けています。
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Users className="size-5" />} label="参加者" value={participantCount} />
              <Stat icon={<CheckCircle2 className="size-5" />} label="回答数" value={answeredCount} />
            </div>
            <div className="grid gap-2">
              <Button
                size="lg"
                icon={<Play className="size-5" aria-hidden="true" />}
                disabled={!canStart || busy !== null}
                onClick={() => selectedQuestion && onControl("start_question", selectedQuestion.id)}
              >
                問題開始
              </Button>
              <Button
                size="lg"
                variant="danger"
                icon={<Square className="size-5" aria-hidden="true" />}
                disabled={!canClose || busy !== null}
                onClick={() => onControl("close_question")}
              >
                回答締切
              </Button>
              <Button
                size="lg"
                variant="success"
                icon={<Eye className="size-5" aria-hidden="true" />}
                disabled={!canReveal || busy !== null}
                onClick={() => onControl("reveal_answer")}
              >
                正解発表
              </Button>
              <Button
                size="lg"
                variant="secondary"
                icon={<Trophy className="size-5" aria-hidden="true" />}
                disabled={!canShowRanking || busy !== null}
                onClick={() => onControl("show_ranking")}
              >
                ランキング表示
              </Button>
            </div>
            <Button
              variant="ghost"
              icon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={onRefresh}
              disabled={busy !== null}
            >
              最新状態に更新（{lastRefreshedLabel}）
            </Button>
          </Card>

          <Card className="grid gap-4">
            <CardTitle>現在の状態</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Users className="size-5" />} label="参加者" value={participantCount} />
              <Stat icon={<CheckCircle2 className="size-5" />} label="回答済み" value={answeredCount} />
              <Stat icon={<Clipboard className="size-5" />} label="総回答数" value={totalAnswerCount} />
              <Stat icon={<Trophy className="size-5" />} label="得点残り" value={scoredParticipantCount} />
            </div>
            <p className="text-sm font-bold text-slate-600">
              現在の状態: <span className="font-black text-[#13294b]">{phaseLabel(phase)}</span>
            </p>
            {hasRehearsalResults ? (
              <div className="grid gap-3 rounded-xl border border-[#f59e0b]/40 bg-[#fff6d8] p-3 text-sm font-black leading-6 text-[#6d4b00]">
                <p>リハーサルの回答や得点が残っています。本番前にリセットしてください。</p>
                <Button
                  variant="danger"
                  icon={<RotateCcw className="size-4" aria-hidden="true" />}
                  disabled={!canReset || busy !== null}
                  onClick={() => onControl("reset_run")}
                >
                  回答・得点をリセット
                </Button>
                <p className="text-xs font-bold">
                  回答と得点だけをリセットします。イベント名、問題、URLは残ります。
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-[#d8f7eb] p-3 text-sm font-black text-[#075d4b]">
                本番前のリセット状態は整っています。
              </div>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>現在の問題</CardTitle>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  phase: {phaseLabel(phase)} / 接続: {realtimeStatus} / 最終取得: {lastRefreshedLabel}
                </p>
              </div>
              <select
                value={effectiveSelectedQuestionId ?? ""}
                onChange={(event) => onSelectQuestion(event.target.value)}
                className="min-h-12 rounded-xl border border-[#d9b56d]/60 bg-white px-3 font-bold"
              >
                {questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    Q{question.orderNo}. {question.text}
                  </option>
                ))}
              </select>
            </div>
            {selectedQuestion ? (
              <div className="rounded-2xl bg-[#13294b] p-5 text-white">
                <p className="text-sm font-black text-[#ffe7a3]">Q{selectedQuestion.orderNo}</p>
                <div className="mt-2">
                  <QuestionScoreBadges question={selectedQuestion} />
                </div>
                <p className="mt-2 text-2xl font-black leading-snug">{selectedQuestion.text}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {selectedQuestion.options.map((option, index) => (
                    <div
                      key={`${option}-${index}`}
                      className="rounded-xl bg-white/10 p-3 text-base font-bold"
                    >
                      {String.fromCharCode(65 + index)}. {option}
                      {selectedQuestion.correctIndex === index ? (
                        <span className="ml-2 rounded-full bg-[#ffe7a3] px-2 py-1 text-xs font-black text-[#6d4b00]">
                          正解
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="問題がありません" description="問題編集タブから問題を追加してください。" />
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="grid gap-4">
              <CardTitle>回答分布</CardTitle>
              <AnswerDistributionChart
                distribution={distribution}
                showCorrect={phase === "answer" || phase === "ranking" || phase === "finished"}
              />
            </Card>
            <Card className="grid gap-4">
              <CardTitle>ランキング</CardTitle>
              <RankingList ranking={ranking} limit={10} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function nextOperationLabel(phase: string): string {
  if (phase === "lobby" || phase === "ranking" || phase === "answer" || phase === "closed") {
    return phase === "closed" ? "正解を発表する" : phase === "answer" ? "ランキングを表示する" : "問題を開始する";
  }
  if (phase === "question") {
    return "回答を締め切る";
  }
  return "必要なら待機に戻す";
}

function nextOperationDescription(phase: string): string {
  if (phase === "question") {
    return "回答が集まったら、回答を締め切ってください。";
  }
  if (phase === "closed") {
    return "回答は締め切られています。会場の準備ができたら正解を発表してください。";
  }
  if (phase === "answer") {
    return "正解を確認したら、ランキングを表示して盛り上げましょう。";
  }
  if (phase === "ranking") {
    return "次の問題を選んで、問題を開始できます。";
  }
  if (phase === "finished") {
    return "イベントは終了しています。再開やリセットは設定タブで行えます。";
  }
  return "開始する問題を選び、問題を開始してください。";
}
