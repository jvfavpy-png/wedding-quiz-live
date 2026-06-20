"use client";

import { useMemo, useState } from "react";
import { PartyPopper, Users } from "lucide-react";
import { buildPublicRoomUrls, resolveAppBaseUrl } from "@/lib/app-url";
import { useLiveRoom } from "@/lib/use-live-room";
import { isRevealPhase, normalizeRoomCode } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { PhaseBadge } from "@/components/quiz/phase-badge";
import { QRCodeBlock } from "@/components/quiz/qr-code-block";
import { CountdownText } from "@/components/quiz/countdown-text";
import { AnswerDistributionChart } from "@/components/quiz/answer-distribution";
import { RankingList } from "@/components/quiz/ranking-list";
import { QuestionScoreBadges } from "@/components/quiz/question-score-badges";
import { ConnectionStatus } from "@/components/quiz/connection-status";
import { ConfettiBurst } from "@/components/effects/confetti-burst";

interface ScreenClientProps {
  roomCode: string;
}

export function ScreenClient({ roomCode }: ScreenClientProps) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const live = useLiveRoom(normalizedRoomCode);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  const joinUrl = useMemo(() => {
    return buildPublicRoomUrls(resolveAppBaseUrl({ windowOrigin: origin }), normalizedRoomCode).joinUrl;
  }, [normalizedRoomCode, origin]);

  const snapshot = live.snapshot;
  const phase = snapshot?.liveState.phase ?? "lobby";
  const question = snapshot?.currentQuestion ?? null;
  const reveal = isRevealPhase(phase);

  if (live.loading && !snapshot) {
    return (
      <main className="min-h-screen bg-[#fff8e7] p-10">
        <LoadingState label="スクリーンを準備しています" />
      </main>
    );
  }

  if (!snapshot && live.error) {
    return (
      <main className="min-h-screen bg-[#fff8e7] p-10 text-[#13294b]">
        <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-4xl content-center gap-6 rounded-3xl bg-white/80 p-10 text-center shadow-xl">
          <h1 className="text-6xl font-black tracking-normal">スクリーンを表示できません</h1>
          <ErrorMessage message={live.error} />
          <p className="text-3xl font-black text-slate-700">
            URLが間違っている可能性があります。roomCode「{normalizedRoomCode}」を主催者に確認してください。
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fff1b8_0%,transparent_32%),linear-gradient(135deg,#fff8e7_0%,#ffffff_38%,#ffe1ea_70%,#dfe9ff_100%)] p-8 text-[#13294b]">
      <div className="mx-auto grid h-[calc(100vh-64px)] max-w-[1600px] grid-rows-[auto_auto_1fr] gap-6">
        <header className="flex items-center justify-between gap-6 rounded-3xl border border-white/70 bg-white/85 px-8 py-5 shadow-xl shadow-[#13294b]/10">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-2xl font-black text-[#d89a22]">
              <PartyPopper className="size-8" aria-hidden="true" />
              Wedding Quiz Live
            </p>
            <h1 className="truncate text-5xl font-black tracking-normal">
              {snapshot?.event.title ?? normalizedRoomCode}
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 rounded-2xl bg-[#13294b] px-6 py-4 text-white">
              <Users className="size-8" aria-hidden="true" />
              <div>
                <p className="text-sm font-black text-white/70">参加者</p>
                <p className="text-4xl font-black">{snapshot?.participantCount ?? 0}</p>
              </div>
            </div>
            <PhaseBadge phase={phase} large />
          </div>
        </header>

        <ConnectionStatus status={live.realtimeStatus} error={live.error} onRefresh={live.refresh} screen />

        {phase === "lobby" ? (
          <section className="grid grid-cols-[1.1fr_420px] items-center gap-10 rounded-3xl bg-white/68 p-10 shadow-xl shadow-[#13294b]/10">
            <div>
              <p className="text-3xl font-black text-[#d89a22]">まもなく開始します</p>
              <h2 className="mt-4 text-7xl font-black leading-tight tracking-normal">
                スマホでQRを読み取って参加してください
              </h2>
              <p className="mt-8 break-all text-4xl font-black text-[#13294b]">{joinUrl}</p>
              <p className="mt-4 text-4xl font-black text-[#d89a22]">roomCode: {normalizedRoomCode}</p>
            </div>
            <QRCodeBlock value={joinUrl} size={360} />
          </section>
        ) : null}

        {question && phase === "question" ? (
          <section className="grid grid-cols-[1fr_320px] gap-8 rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <div className="grid content-center gap-8">
              <div>
                <p className="text-4xl font-black text-[#d89a22]">Q{question.orderNo}</p>
                <div className="mt-3">
                  <QuestionScoreBadges question={question} large showDifficulty={false} showSpeedBonus={false} />
                </div>
              </div>
              <h2 className="text-7xl font-black leading-tight tracking-normal">{question.text}</h2>
              <div className="grid gap-4">
                {question.options.map((option, index) => (
                  <div
                    key={`${option}-${index}`}
                    className="rounded-2xl border border-white bg-white/90 px-6 py-4 text-4xl font-black shadow"
                  >
                    <span className="text-[#d89a22]">{String.fromCharCode(65 + index)}.</span> {option}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid content-center justify-items-center gap-8">
              <div className="grid size-72 place-items-center rounded-full bg-[#13294b] text-white shadow-2xl shadow-[#13294b]/30">
                <CountdownText
                  startedAt={snapshot?.liveState.questionStartedAt ?? null}
                  limitSec={question.timeLimitSec}
                  serverNowOffsetMs={live.serverNowOffsetMs}
                  className="text-9xl font-black"
                />
              </div>
              <p className="text-3xl font-black text-[#13294b]">回答受付中</p>
              <p className="text-5xl font-black text-[#d89a22]">{live.distribution?.total ?? 0} 回答</p>
            </div>
          </section>
        ) : null}

        {question && phase === "closed" ? (
          <section className="grid gap-6 rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <div>
              <p className="text-4xl font-black text-[#d89a22]">回答を締め切りました。</p>
              <div className="mt-3">
                <QuestionScoreBadges question={question} large showDifficulty={false} showSpeedBonus={false} />
              </div>
              <h2 className="mt-2 text-6xl font-black tracking-normal">{question.text}</h2>
            </div>
            <p className="text-3xl font-black text-slate-700">
              正解発表まで少しお待ちください。回答数 {live.distribution?.total ?? 0}
            </p>
            <AnswerDistributionChart distribution={live.distribution} screen />
          </section>
        ) : null}

        {question && phase === "answer" ? (
          <section className="relative grid grid-cols-[1fr_1fr] gap-8 overflow-hidden rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <ConfettiBurst active />
            <div className="grid content-center gap-6">
              <p className="text-4xl font-black text-[#d89a22]">正解発表</p>
              <QuestionScoreBadges question={question} large showDifficulty={false} showSpeedBonus={false} />
              <h2 className="text-6xl font-black leading-tight tracking-normal">{question.text}</h2>
              {typeof question.correctIndex === "number" ? (
                <div className="rounded-3xl bg-[#ffe7a3] p-8 text-[#6d4b00] shadow-xl">
                  <p className="text-3xl font-black">正解は、{String.fromCharCode(65 + question.correctIndex)}！</p>
                  <p className="mt-2 text-6xl font-black">
                    {String.fromCharCode(65 + question.correctIndex)}.{" "}
                    {question.options[question.correctIndex]}
                  </p>
                </div>
              ) : null}
            </div>
            <AnswerDistributionChart distribution={live.distribution} showCorrect={reveal} screen />
          </section>
        ) : null}

        {phase === "ranking" ? (
          <section className="relative grid gap-6 overflow-hidden rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <ConfettiBurst active />
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-4xl font-black text-[#d89a22]">TOP 10</p>
                <h2 className="text-7xl font-black tracking-normal">ランキング</h2>
              </div>
              <p className="text-3xl font-black text-slate-600">参加者 {snapshot?.participantCount ?? 0}人</p>
            </div>
            <RankingList ranking={live.ranking} limit={10} screen />
          </section>
        ) : null}

        {phase === "finished" ? (
          <section className="relative grid gap-6 overflow-hidden rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <ConfettiBurst active />
            <div>
              <p className="text-4xl font-black text-[#d89a22]">Final Result</p>
              <h2 className="text-7xl font-black tracking-normal">最終結果</h2>
            </div>
            <RankingList ranking={live.ranking} limit={10} screen />
          </section>
        ) : null}
      </div>
    </main>
  );
}
