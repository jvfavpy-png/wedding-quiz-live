"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PartyPopper, Users } from "lucide-react";
import { buildPublicRoomUrls, resolveAppBaseUrl } from "@/lib/app-url";
import { getThemeVars } from "@/lib/design-themes";
import { providedSoundAssetUrls } from "@/lib/sound-asset-manifest";
import { createSoundPlayer } from "@/lib/sound-effects";
import { defaultSoundSettings, normalizeSoundSettings } from "@/lib/sound-settings";
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
import { ConfettiBurst } from "@/components/effects/confetti-burst";
import { ScreenTransition } from "@/components/effects/screen-transition";
import { ScreenSoundControl } from "@/components/screen/sound-control";
import type { RankingEntry } from "@/types/quiz";

interface ScreenClientProps {
  roomCode: string;
}

export function ScreenClient({ roomCode }: ScreenClientProps) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const live = useLiveRoom(normalizedRoomCode);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const soundPlayer = useMemo(() => createSoundPlayer(), []);
  const [soundReady, setSoundReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [clockMs, setClockMs] = useState(0);
  const [answerRevealState, setAnswerRevealState] = useState({ key: "", ready: false });
  const [rankingRevealState, setRankingRevealState] = useState({ key: "", count: 10 });
  const [mountedAt] = useState(() => Date.now());
  const previousSoundKey = useRef<string | null>(null);
  const previousCountdown = useRef<number | null>(null);
  const revealCorrectTimer = useRef<number | null>(null);

  const joinUrl = useMemo(() => {
    return buildPublicRoomUrls(resolveAppBaseUrl({ windowOrigin: origin }), normalizedRoomCode).joinUrl;
  }, [normalizedRoomCode, origin]);

  const snapshot = live.snapshot;
  const themeVars = getThemeVars(snapshot?.event.designTheme);
  const soundSettings = normalizeSoundSettings(snapshot?.event.sound ?? defaultSoundSettings);
  const volume = soundSettings.screenVolume;
  const soundAssets = useMemo(() => {
    const entries = (snapshot?.soundAssets ?? []).map((asset) => [asset.soundKey, asset.fileUrl] as const);
    return { ...providedSoundAssetUrls, ...Object.fromEntries(entries) };
  }, [snapshot?.soundAssets]);
  const soundEnabled = soundSettings.soundEnabled;
  const effectsEnabled =
    soundSettings.visualEffectsEnabled && soundSettings.screenConfettiEnabled && !reducedMotion;
  const subtleEffectsEnabled = soundSettings.visualEffectsEnabled && !reducedMotion;
  const phase = snapshot?.liveState.phase ?? "lobby";
  const question = snapshot?.currentQuestion ?? null;
  const answerRevealKey = `${phase}:${question?.id ?? "none"}:${soundSettings.effectStyle}:${soundSettings.revealDelaySeconds}`;
  const answerRevealReady =
    phase === "answer" && answerRevealState.key === answerRevealKey && answerRevealState.ready;
  const rankingRevealKey = `${phase}:${snapshot?.liveState.updatedAt ?? "none"}:${soundSettings.effectStyle}`;
  const rankingRevealCount =
    (phase === "ranking" || phase === "finished") && rankingRevealState.key === rankingRevealKey
      ? rankingRevealState.count
      : 10;
  const reveal = isRevealPhase(phase);
  const remainingSeconds = question
    ? getRemainingSeconds(
        snapshot?.liveState.questionStartedAt ?? null,
        question.timeLimitSec,
        live.serverNowOffsetMs,
        clockMs,
      )
    : null;
  const showConnectionWarning = shouldShowScreenConnectionWarning({
    error: live.error,
    realtimeStatus: live.realtimeStatus,
    lastRefreshedAt: live.lastRefreshedAt,
    mountedAt,
    nowMs: clockMs,
  });

  useEffect(() => {
    const tick = () => setClockMs(Date.now());
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    updateFullscreen();
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    return () => {
      if (revealCorrectTimer.current) {
        window.clearTimeout(revealCorrectTimer.current);
        revealCorrectTimer.current = null;
      }
      soundPlayer?.stopAllSounds();
    };
  }, [soundPlayer]);

  useEffect(() => {
    if (!soundPlayer || !soundReady || !soundEnabled) {
      previousSoundKey.current = null;
      previousCountdown.current = null;
      if (revealCorrectTimer.current) {
        window.clearTimeout(revealCorrectTimer.current);
        revealCorrectTimer.current = null;
      }
      soundPlayer?.stopAllSounds();
      return;
    }

    const key = `${phase}:${question?.id ?? "none"}:${soundSettings.revealDelaySeconds}`;
    if (previousSoundKey.current === key) {
      return;
    }
    previousSoundKey.current = key;
    previousCountdown.current = null;
    if (revealCorrectTimer.current) {
      window.clearTimeout(revealCorrectTimer.current);
      revealCorrectTimer.current = null;
    }

    if (phase !== "question") {
      soundPlayer.stopSound("countdown");
    }
    if (phase !== "answer") {
      soundPlayer.fadeOutSound("reveal", 100);
    }
    if (phase === "ranking" || phase === "finished") {
      soundPlayer.stopSound("close");
      soundPlayer.stopSound("countdown");
      soundPlayer.fadeOutSound("reveal", 100);
    }

    if (phase === "question" && question) {
      soundPlayer.stopSound("countdown");
      soundPlayer.playSound("start", {
        volume,
        soundPack: soundSettings.soundPack,
        customAssets: soundAssets,
      });
    } else if (phase === "closed") {
      soundPlayer.stopSound("countdown");
      soundPlayer.playSound("close", {
        volume,
        soundPack: soundSettings.soundPack,
        customAssets: soundAssets,
      });
    } else if (phase === "answer" && question) {
      soundPlayer.stopSound("countdown");
      soundPlayer.fadeOutSound("close", 120);
      soundPlayer.playSound("reveal", {
        volume,
        soundPack: soundSettings.soundPack,
        customAssets: soundAssets,
      });
      revealCorrectTimer.current = window.setTimeout(() => {
        soundPlayer.fadeOutSound("reveal", 160);
        soundPlayer.playSound("correct", {
          volume,
          soundPack: soundSettings.soundPack,
          customAssets: soundAssets,
        });
        revealCorrectTimer.current = null;
      }, revealDelayMs(soundSettings.revealDelaySeconds));
    } else if (phase === "ranking") {
      soundPlayer.playSound("ranking", {
        volume,
        soundPack: soundSettings.soundPack,
        customAssets: soundAssets,
      });
    } else if (phase === "finished") {
      soundPlayer.playSound("winner", {
        volume,
        soundPack: soundSettings.soundPack,
        customAssets: soundAssets,
      });
    }
  }, [
    phase,
    question,
    soundAssets,
    soundEnabled,
    soundPlayer,
    soundReady,
    soundSettings.revealDelaySeconds,
    soundSettings.soundPack,
    volume,
  ]);

  useEffect(() => {
    if (!soundPlayer || !soundReady || !soundEnabled || phase !== "question" || remainingSeconds === null) {
      return;
    }

    if (remainingSeconds <= 0) {
      soundPlayer.stopSound("countdown");
      previousCountdown.current = null;
      return;
    }

    if (remainingSeconds > 0 && remainingSeconds <= 3 && previousCountdown.current !== remainingSeconds) {
      previousCountdown.current = remainingSeconds;
      soundPlayer.playSound("countdown", {
        volume,
        soundPack: soundSettings.soundPack,
        customAssets: soundAssets,
      });
    }
  }, [phase, remainingSeconds, soundAssets, soundEnabled, soundPlayer, soundReady, soundSettings.soundPack, volume]);

  useEffect(() => {
    if (phase !== "question") {
      previousCountdown.current = null;
    }
  }, [phase, question?.id]);

  useEffect(() => {
    if (phase !== "answer") {
      return;
    }
    const timer = window.setTimeout(
      () => setAnswerRevealState({ key: answerRevealKey, ready: true }),
      revealDelayMs(soundSettings.revealDelaySeconds),
    );
    return () => clearTimeout(timer);
  }, [answerRevealKey, phase, soundSettings.revealDelaySeconds]);

  useEffect(() => {
    if (phase !== "ranking" && phase !== "finished") {
      return;
    }
    if (reducedMotion || soundSettings.effectStyle === "minimal" || soundSettings.effectStyle === "standard") {
      return;
    }
    const third = window.setTimeout(() => setRankingRevealState({ key: rankingRevealKey, count: 3 }), 0);
    const second = window.setTimeout(() => setRankingRevealState({ key: rankingRevealKey, count: 2 }), 650);
    const first = window.setTimeout(() => {
      setRankingRevealState({ key: rankingRevealKey, count: 1 });
      if (soundPlayer && soundReady && soundEnabled) {
        soundPlayer.playSound("winner", {
          volume,
          soundPack: soundSettings.soundPack,
          customAssets: soundAssets,
        });
      }
    }, 1300);
    const all = window.setTimeout(() => setRankingRevealState({ key: rankingRevealKey, count: 10 }), 2200);
    return () => {
      clearTimeout(third);
      clearTimeout(second);
      clearTimeout(first);
      clearTimeout(all);
    };
  }, [
    phase,
    reducedMotion,
    soundAssets,
    soundEnabled,
    soundPlayer,
    soundReady,
    soundSettings.effectStyle,
    soundSettings.soundPack,
    volume,
    rankingRevealKey,
  ]);

  async function enableSound() {
    if (!soundPlayer) {
      return;
    }

    await soundPlayer.unlock();
    setSoundReady(true);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }

  if (live.loading && !snapshot) {
    return (
      <main className="min-h-screen bg-[var(--wql-bg)] p-10" style={themeVars}>
        <LoadingState label="スクリーンを準備しています" />
      </main>
    );
  }

  if (!snapshot && live.error) {
    return (
      <main className="min-h-screen bg-[var(--wql-bg)] p-10 text-[var(--wql-text)]" style={themeVars}>
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
    <main
      className="min-h-screen overflow-hidden p-8 text-[var(--wql-text)]"
      style={{ ...themeVars, background: "var(--wql-screen-gradient)" }}
    >
      <div
        className={[
          "mx-auto grid h-[calc(100vh-64px)] max-w-[1600px] gap-6",
          phase === "lobby" ? "grid-rows-[auto_auto_1fr]" : "grid-rows-[auto_1fr]",
        ].join(" ")}
      >
        <header className="flex items-center justify-between gap-6 rounded-3xl border border-white/70 bg-[var(--wql-card)] px-8 py-5 shadow-xl shadow-[#13294b]/10">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-2xl font-black text-[var(--wql-accent-strong)]">
              <PartyPopper className="size-8" aria-hidden="true" />
              Wedding Quiz Live
            </p>
            <h1 className="truncate text-5xl font-black tracking-normal">
              {snapshot?.event.title ?? normalizedRoomCode}
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--wql-text)] px-6 py-4 text-white">
              <Users className="size-8" aria-hidden="true" />
              <div>
                <p className="text-sm font-black text-white/70">参加者</p>
                <p className="text-4xl font-black">{snapshot?.participantCount ?? 0}</p>
              </div>
            </div>
            <PhaseBadge phase={phase} large />
          </div>
        </header>

        {phase === "lobby" ? (
          <ScreenSoundControl
            soundSupported={Boolean(soundPlayer)}
            soundEnabled={soundEnabled}
            soundReady={soundReady}
            fullscreen={fullscreen}
            fullscreenSupported={typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen)}
            onEnableSound={() => void enableSound()}
            onToggleFullscreen={() => void toggleFullscreen()}
          />
        ) : null}

        <ScreenTransition key={`${phase}:${question?.id ?? "none"}`} className="min-h-0">
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
          <section className={["grid grid-cols-[1fr_320px] gap-8 rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10", subtleEffectsEnabled ? "screen-scene-enter" : ""].join(" ")}>
            <div className="grid content-center gap-8">
              <div>
                <p className="text-4xl font-black text-[#d89a22]">Q{question.orderNo}</p>
                <div className="mt-3">
                  <QuestionScoreBadges question={question} large showDifficulty={false} showSpeedBonus={false} />
                </div>
              </div>
              <h2 className="text-7xl font-black leading-tight tracking-normal">{question.text}</h2>
              {question.imageUrl ? (
                <img
                  src={question.imageUrl}
                  alt=""
                  className="max-h-80 w-full rounded-3xl object-cover shadow-xl"
                />
              ) : null}
              <div className="grid gap-4">
                {question.options.map((option, index) => (
                  <div
                    key={`${option}-${index}`}
                    className="rounded-2xl border border-white bg-white/90 px-6 py-4 text-4xl font-black shadow"
                  >
                    {question.optionImageUrls[index] ? (
                      <img
                        src={question.optionImageUrls[index] ?? ""}
                        alt=""
                        className="mb-3 max-h-36 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    <span className="text-[#d89a22]">{String.fromCharCode(65 + index)}.</span> {option}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid content-center justify-items-center gap-8">
              <div
                className={[
                  "grid size-72 place-items-center rounded-full bg-[var(--wql-text)] text-white shadow-2xl shadow-[#13294b]/30",
                  remainingSeconds !== null && remainingSeconds <= 3 ? "countdown-warning" : "",
                ].join(" ")}
              >
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
          <section className={["grid gap-6 rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10", subtleEffectsEnabled ? "screen-scene-enter" : ""].join(" ")}>
            <div>
              <p className="text-4xl font-black text-[#d89a22]">回答を締め切りました。</p>
              <div className="mt-3">
                <QuestionScoreBadges question={question} large showDifficulty={false} showSpeedBonus={false} />
              </div>
              <h2 className="mt-2 text-6xl font-black tracking-normal">{question.text}</h2>
              {question.imageUrl ? (
                <img src={question.imageUrl} alt="" className="mt-5 max-h-72 w-full rounded-3xl object-cover shadow-xl" />
              ) : null}
            </div>
            <p className="text-3xl font-black text-slate-700">
              正解発表まで少しお待ちください。回答数 {live.distribution?.total ?? 0}
            </p>
            <AnswerDistributionChart distribution={live.distribution} screen />
          </section>
        ) : null}

        {question && phase === "answer" ? (
          <section className="relative grid grid-cols-[1fr_1fr] gap-8 overflow-hidden rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <ConfettiBurst active={effectsEnabled} />
            {!answerRevealReady ? (
              <div className="col-span-2 grid min-h-[520px] content-center justify-items-center gap-8 text-center">
                <p className="text-4xl font-black text-[#d89a22]">正解発表</p>
                <h2 className="text-8xl font-black tracking-normal text-[var(--wql-text)]">正解は……</h2>
                <p className="max-w-4xl text-4xl font-black leading-tight text-slate-700">{question.text}</p>
              </div>
            ) : (
              <>
                <div className="grid content-center gap-6">
                  <p className="text-4xl font-black text-[#d89a22]">正解発表</p>
                  <QuestionScoreBadges question={question} large showDifficulty={false} showSpeedBonus={false} />
                  <h2 className="text-6xl font-black leading-tight tracking-normal">{question.text}</h2>
                  {question.imageUrl ? (
                    <img src={question.imageUrl} alt="" className="max-h-72 w-full rounded-3xl object-cover shadow-xl" />
                  ) : null}
                  {typeof question.correctIndex === "number" ? (
                    <div className={["rounded-3xl bg-[#ffe7a3] p-8 text-[#6d4b00] shadow-xl", subtleEffectsEnabled ? "answer-reveal-card" : ""].join(" ")}>
                      <p className="text-3xl font-black">正解は、{String.fromCharCode(65 + question.correctIndex)}！</p>
                      {question.optionImageUrls[question.correctIndex] ? (
                        <img
                          src={question.optionImageUrls[question.correctIndex] ?? ""}
                          alt=""
                          className="my-4 max-h-56 w-full rounded-2xl object-cover"
                        />
                      ) : null}
                      <p className="mt-2 text-6xl font-black">
                        {String.fromCharCode(65 + question.correctIndex)}.{" "}
                        {question.options[question.correctIndex]}
                      </p>
                    </div>
                  ) : null}
                </div>
                <AnswerDistributionChart distribution={live.distribution} showCorrect={reveal} screen />
              </>
            )}
          </section>
        ) : null}

        {phase === "ranking" ? (
          <section className="relative grid gap-6 overflow-hidden rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <ConfettiBurst active={effectsEnabled} />
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-4xl font-black text-[#d89a22]">TOP 10</p>
                <h2 className="text-7xl font-black tracking-normal">ランキング</h2>
              </div>
              <p className="text-3xl font-black text-slate-600">参加者 {snapshot?.participantCount ?? 0}人</p>
            </div>
            <TopThreeSpotlight ranking={live.ranking} revealCount={rankingRevealCount} />
            <RankingList ranking={live.ranking} limit={10} screen />
          </section>
        ) : null}

        {phase === "finished" ? (
          <section className="relative grid gap-6 overflow-hidden rounded-3xl bg-white/72 p-10 shadow-xl shadow-[#13294b]/10">
            <ConfettiBurst active={effectsEnabled} />
            <div>
              <p className="text-4xl font-black text-[#d89a22]">Final Result</p>
              <h2 className="text-7xl font-black tracking-normal">最終結果</h2>
            </div>
            <TopThreeSpotlight ranking={live.ranking} revealCount={rankingRevealCount} />
            <RankingList ranking={live.ranking} limit={10} screen />
          </section>
        ) : null}
        </ScreenTransition>
      </div>
      <ScreenConnectionWarning visible={showConnectionWarning} onRefresh={() => void live.refresh()} />
    </main>
  );
}

function getRemainingSeconds(
  startedAt: string | null,
  limitSec: number,
  serverNowOffsetMs: number,
  clientNowMs: number,
): number {
  if (!startedAt) {
    return limitSec;
  }

  const startedAtMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) {
    return limitSec;
  }

  const nowMs = (clientNowMs || Date.now()) + serverNowOffsetMs;
  const elapsedSec = (nowMs - startedAtMs) / 1000;
  return Math.max(0, Math.ceil(limitSec - elapsedSec));
}

function revealDelayMs(revealDelaySeconds: number): number {
  if (!Number.isFinite(revealDelaySeconds)) {
    return 1200;
  }

  return Math.round(Math.min(5, Math.max(0, revealDelaySeconds)) * 1000);
}

function shouldShowScreenConnectionWarning({
  error,
  realtimeStatus,
  lastRefreshedAt,
  mountedAt,
  nowMs,
}: {
  error: string | null;
  realtimeStatus: string;
  lastRefreshedAt: number | null;
  mountedAt: number;
  nowMs: number;
}): boolean {
  const now = nowMs || Date.now();
  const lastHealthyAt = lastRefreshedAt ?? mountedAt;
  const stale = now - lastHealthyAt >= 10_000;
  return stale && (Boolean(error) || realtimeStatus === "reconnecting");
}

function ScreenConnectionWarning({
  visible,
  onRefresh,
}: {
  visible: boolean;
  onRefresh: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-5 z-50 mx-auto flex w-fit max-w-[calc(100vw-32px)] items-center gap-3 rounded-full bg-[#13294b]/72 px-4 py-2 text-xs font-black text-white shadow-xl backdrop-blur"
      role="status"
    >
      <span>通信が不安定です。復旧を待っています。</span>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-full bg-white/16 px-3 py-1 text-white transition hover:bg-white/24"
      >
        再読み込み
      </button>
    </div>
  );
}

function TopThreeSpotlight({
  ranking,
  revealCount,
}: {
  ranking: RankingEntry[];
  revealCount: number;
}) {
  const topThree = ranking.slice(0, 3);
  if (topThree.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {topThree.map((entry) => {
        const visible = entry.rank >= revealCount || revealCount >= 10;
        return (
          <div
            key={entry.participantId}
            className={[
              "grid min-h-36 content-center justify-items-center rounded-3xl border border-white/80 bg-white/82 p-5 text-center shadow-lg transition duration-500",
              entry.rank === 1 ? "bg-[#fff6d8] md:-mt-4" : "",
              visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-25",
            ].join(" ")}
          >
            <p className="text-2xl font-black text-[#d89a22]">{entry.rank}位</p>
            <div className="mt-2 grid size-16 place-items-center overflow-hidden rounded-full bg-[var(--wql-accent-soft)] text-2xl font-black text-[var(--wql-accent-text)]">
              {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="size-full object-cover" /> : entry.name.slice(0, 1)}
            </div>
            <p className="mt-2 max-w-full truncate text-3xl font-black text-[var(--wql-text)]">{entry.name}</p>
            <p className="text-xl font-black text-slate-600">{entry.score}点</p>
          </div>
        );
      })}
    </div>
  );
}
