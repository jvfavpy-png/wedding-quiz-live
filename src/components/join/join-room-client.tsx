"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Edit3, Loader2, PartyPopper, RefreshCw, Send, Trophy } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import {
  createParticipantToken,
  participantStorageKey,
  readParticipantSession,
} from "@/lib/participant-session";
import { getThemeVars } from "@/lib/design-themes";
import { defaultSoundSettings, normalizeSoundSettings } from "@/lib/sound-settings";
import { useLiveRoom } from "@/lib/use-live-room";
import { isRevealPhase, normalizeRoomCode, phaseLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { PhaseBadge } from "@/components/quiz/phase-badge";
import { CountdownText } from "@/components/quiz/countdown-text";
import { RankingList } from "@/components/quiz/ranking-list";
import { QuestionScoreBadges } from "@/components/quiz/question-score-badges";
import { ConnectionStatus } from "@/components/quiz/connection-status";
import { ConfettiBurst } from "@/components/effects/confetti-burst";
import type { MyAnswer, ParticipantSession, Phase } from "@/types/quiz";

interface JoinRoomClientProps {
  roomCode: string;
}

interface SubmitAnswerResult {
  accepted: boolean;
  selectedIndex: number;
  responseMs: number;
}

export function JoinRoomClient({ roomCode }: JoinRoomClientProps) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const live = useLiveRoom(normalizedRoomCode);
  const storageKey = useMemo(() => participantStorageKey(normalizedRoomCode), [normalizedRoomCode]);
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [myAnswer, setMyAnswer] = useState<MyAnswer | null>(null);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateNameCount, setDuplicateNameCount] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const snapshot = live.snapshot;
  const themeVars = getThemeVars(snapshot?.event.designTheme);
  const soundSettings = normalizeSoundSettings(snapshot?.event.sound ?? defaultSoundSettings);
  const phase = snapshot?.liveState.phase ?? "lobby";
  const question = snapshot?.currentQuestion ?? null;
  const reveal = isRevealPhase(phase);
  const answered = Boolean(myAnswer && question && myAnswer.questionId === question.id);
  const canAnswer = phase === "question" && Boolean(question) && Boolean(session) && !answered && !submitting;
  const myRank = session ? live.ranking.find((entry) => entry.participantId === session.participantId) : undefined;

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      void fetchJson<{ duplicateCount: number }>(
        `/api/rooms/${encodeURIComponent(normalizedRoomCode)}/name-check?name=${encodeURIComponent(trimmedName)}`,
      )
        .then((result) => {
          if (active) {
            const currentOwnName = session?.name === trimmedName ? 1 : 0;
            setDuplicateNameCount(Math.max(0, result.duplicateCount - currentOwnName));
          }
        })
        .catch(() => {
          if (active) {
            setDuplicateNameCount(0);
          }
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, normalizedRoomCode, session?.name]);

  const changeName = useCallback((value: string) => {
    const nextName = value.slice(0, 20);
    setName(nextName);
    if (!nextName.trim()) {
      setDuplicateNameCount(0);
    }
  }, []);

  const changeAvatarFile = useCallback((file: File | null) => {
    setAvatarFile(file);
    setAvatarPreviewUrl(file ? URL.createObjectURL(file) : null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = readParticipantSession(
        typeof window === "undefined" ? null : window.localStorage,
        storageKey,
      );
      if (stored) {
        setSession(stored);
        setName(stored.name);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [storageKey]);

  const loadMyAnswer = useCallback(
    async (questionId: string): Promise<MyAnswer | null> => {
      if (!session) {
        return null;
      }

      return fetchJson<MyAnswer | null>(
        `/api/rooms/${encodeURIComponent(normalizedRoomCode)}/my-answer`,
        {
          method: "POST",
          body: JSON.stringify({
            participantId: session.participantId,
            participantToken: session.participantToken,
            questionId,
          }),
        },
      );
    },
    [normalizedRoomCode, session],
  );

  useEffect(() => {
    if (!session || !question) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      void loadMyAnswer(question.id).then((answer) => {
        if (active) {
          setMyAnswer(answer);
        }
      });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadMyAnswer, phase, question, session]);

  async function join() {
    try {
      setJoining(true);
      setError(null);
      const participantToken = session?.participantToken ?? createParticipantToken();
      const participant = await fetchJson<ParticipantSession>("/api/join", {
        method: "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          name,
          participantToken,
        }),
      });
      let nextParticipant = participant;
      if (avatarFile) {
        try {
          const avatarUrl = await uploadAvatar(participant, avatarFile);
          nextParticipant = { ...participant, avatarUrl };
        } catch {
          setError("参加は完了しましたが、プロフィール画像のアップロードに失敗しました。あとから再設定できます。");
        }
      }
      setSession(nextParticipant);
      setEditingName(false);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      window.localStorage.setItem(storageKey, JSON.stringify(nextParticipant));
      await live.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "参加に失敗しました");
    } finally {
      setJoining(false);
    }
  }

  async function uploadAvatar(participant: ParticipantSession, file: File): Promise<string> {
    const form = new FormData();
    form.set("roomCode", normalizedRoomCode);
    form.set("participantId", participant.participantId);
    form.set("participantToken", participant.participantToken);
    form.set("file", file);

    const uploaded = await fetchJson<{ publicUrl: string }>("/api/participants/avatar", {
      method: "POST",
      body: form,
    });
    return uploaded.publicUrl;
  }

  async function submitAnswer(selectedIndex: number) {
    if (!session || !question || !canAnswer) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await fetchJson<SubmitAnswerResult>("/api/answer", {
        method: "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          participantId: session.participantId,
          participantToken: session.participantToken,
          questionId: question.id,
          selectedIndex,
        }),
      });

      if (result.accepted) {
        setMyAnswer({
          questionId: question.id,
          selectedIndex: result.selectedIndex,
          responseMs: result.responseMs,
          isCorrect: null,
          point: null,
          basePoints: null,
          speedBonus: null,
          totalScore: null,
        });
      }

      await live.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "回答送信に失敗しました");
      const answer = await loadMyAnswer(question.id).catch(() => null);
      setMyAnswer(answer);
    } finally {
      setSubmitting(false);
    }
  }

  if (live.loading && !snapshot) {
    return (
      <main className="min-h-[100svh] bg-[var(--wql-bg)] p-4" style={themeVars}>
        <LoadingState label="イベントを確認しています" />
      </main>
    );
  }

  if (!session) {
    return (
      <main
        className="min-h-[100svh] px-4 py-6 text-[var(--wql-text)]"
        style={{ ...themeVars, background: "var(--wql-page-gradient)" }}
      >
        <div className="mx-auto grid min-h-[calc(100svh-48px)] w-full max-w-md content-center gap-5">
          <header className="text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-[#ffe7a3] text-[#6d4b00] shadow-lg">
              <PartyPopper className="size-8" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-black tracking-normal">
              {snapshot?.event.title ?? "Wedding Quiz Live"}
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-600">roomCode: {normalizedRoomCode}</p>
          </header>

          <ConnectionStatus status={live.realtimeStatus} error={live.error} onRefresh={live.refresh} />

          <Card className="grid gap-4">
            <CardTitle>参加する</CardTitle>
            {error || live.error ? <ErrorMessage message={error ?? live.error ?? ""} /> : null}
            {live.error && !snapshot ? (
              <div className="rounded-xl bg-white p-4 text-sm font-bold leading-6 text-slate-700">
                URLが間違っている可能性があります。招待されたURLを開き直すか、主催者にroomCodeを確認してください。
              </div>
            ) : null}
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-600">お名前</span>
              <input
                value={name}
                onChange={(event) => changeName(event.target.value)}
                className="min-h-14 rounded-xl border border-[#d9b56d]/60 bg-white px-4 text-lg font-bold outline-none ring-[#d9b56d] focus:ring-4"
                placeholder="例：たろう"
                maxLength={20}
              />
            </label>
            {duplicateNameCount > 0 ? (
              <div className="rounded-xl bg-[#fff6d8] p-3 text-xs font-black leading-5 text-[#6d4b00]">
                同じ名前の参加者がいます。ランキングで分かりやすいように、少し変えて入力するのがおすすめです。
              </div>
            ) : null}
            <AvatarPicker avatarUrl={avatarPreviewUrl} disabled={joining} onChange={changeAvatarFile} />
            <Button
              size="lg"
              icon={joining ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              onClick={join}
              disabled={joining || !name.trim() || snapshot?.event.status === "finished"}
            >
              {joining ? "参加中" : "参加する"}
            </Button>
            <Button
              variant="ghost"
              icon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={live.refresh}
              disabled={joining}
            >
              状態を再取得
            </Button>
            <p className="text-xs font-bold leading-5 text-slate-500">
              同姓同名でも参加できます。端末ごとの参加情報で区別します。
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
      <main
        className="min-h-[100svh] px-4 py-5 text-[var(--wql-text)]"
        style={{ ...themeVars, background: "var(--wql-page-gradient)" }}
      >
      <div className="mx-auto grid w-full max-w-md gap-4">
        <header className="rounded-2xl border border-white/70 bg-white/88 p-4 shadow-lg shadow-[#13294b]/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ParticipantAvatar name={session.name} avatarUrl={session.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-500">{snapshot?.event.title}</p>
                <h1 className="truncate text-2xl font-black">{session.name}</h1>
              </div>
            </div>
            <PhaseBadge phase={phase} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
            <span>参加者 {snapshot?.participantCount ?? 0}人</span>
            <button
              type="button"
              onClick={live.refresh}
              className="rounded-full bg-white px-2 py-1 font-black text-[#13294b]"
            >
              再取得
            </button>
            <button
              type="button"
              onClick={() => setEditingName((value) => !value)}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-black text-[#13294b]"
            >
              <Edit3 className="size-3" aria-hidden="true" />
              名前修正
            </button>
          </div>
        </header>

        <ConnectionStatus status={live.realtimeStatus} error={live.error} onRefresh={live.refresh} />

        {editingName ? (
          <Card className="grid gap-3">
            <CardTitle>名前を修正</CardTitle>
            <input
              value={name}
              onChange={(event) => changeName(event.target.value)}
              className="min-h-12 rounded-xl border border-[#d9b56d]/60 bg-white px-4 font-bold outline-none ring-[#d9b56d] focus:ring-4"
              maxLength={20}
            />
            {duplicateNameCount > 0 ? (
              <div className="rounded-xl bg-[#fff6d8] p-3 text-xs font-black leading-5 text-[#6d4b00]">
                同じ名前の参加者がいます。必要なら少し変えてください。
              </div>
            ) : null}
            <AvatarPicker avatarUrl={avatarPreviewUrl ?? session.avatarUrl} disabled={joining} onChange={changeAvatarFile} />
            <Button
              icon={joining ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              onClick={join}
              disabled={joining || !name.trim()}
            >
              名前を更新
            </Button>
          </Card>
        ) : null}

        {error || live.error ? <ErrorMessage message={error ?? live.error ?? ""} /> : null}

        {phase === "finished" ? (
          <Card className="grid gap-4 text-center">
            <Trophy className="mx-auto size-14 text-[#d89a22]" aria-hidden="true" />
            <CardTitle>イベント終了</CardTitle>
            <p className="text-base font-bold text-slate-600">ご参加ありがとうございました。</p>
            <RankingList ranking={live.ranking} currentParticipantId={session.participantId} />
          </Card>
        ) : null}

        {phase !== "finished" && !question ? (
          <Card className="grid min-h-64 place-items-center text-center">
            <div>
              <CardTitle>待機中です</CardTitle>
              <p className="mt-3 text-base font-bold text-slate-600">
                主催者が問題を開始するまで、この画面のままお待ちください。
              </p>
            </div>
          </Card>
        ) : null}

        {question && phase !== "finished" ? (
          <Card className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#d89a22]">Q{question.orderNo}</p>
                <div className="mb-2">
                  <QuestionScoreBadges question={question} showDifficulty={false} showSpeedBonus={false} />
                </div>
                <CardTitle className="leading-snug">{question.text}</CardTitle>
              </div>
              {phase === "question" ? (
                <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#13294b] text-3xl font-black text-white">
                  <CountdownText
                    startedAt={snapshot?.liveState.questionStartedAt ?? null}
                    limitSec={question.timeLimitSec}
                    serverNowOffsetMs={live.serverNowOffsetMs}
                  />
                </div>
              ) : null}
            </div>

            {question.imageUrl ? (
              <img
                src={question.imageUrl}
                alt=""
                className="max-h-52 w-full rounded-2xl object-cover"
                loading="lazy"
              />
            ) : null}

            <div className="grid gap-3">
              {question.options.map((option, index) => {
                const selected = myAnswer?.selectedIndex === index;
                const correct = reveal && question.correctIndex === index;
                const disabled = !canAnswer;

                return (
                  <button
                    key={`${option}-${index}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => submitAnswer(index)}
                    className={[
                      "min-h-16 rounded-2xl border p-4 text-left text-base font-black shadow-sm transition disabled:cursor-not-allowed",
                      selected ? "border-[#ff6f91] bg-[#fff0f5]" : "border-slate-200 bg-white",
                      correct ? "border-[#d89a22] bg-[#fff6d8]" : "",
                      canAnswer ? "active:scale-[0.99]" : "opacity-85",
                    ].join(" ")}
                  >
                    {question.optionImageUrls[index] ? (
                      <img
                        src={question.optionImageUrls[index] ?? ""}
                        alt=""
                        className="mb-3 max-h-32 w-full rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <span className="mr-2 text-[#d89a22]">{String.fromCharCode(65 + index)}.</span>
                    {option}
                    {selected ? <span className="ml-2 text-sm text-[#9f1239]">選択済み</span> : null}
                    {correct ? <span className="ml-2 text-sm text-[#6d4b00]">正解</span> : null}
                  </button>
                );
              })}
            </div>

            <StatusMessage
              phase={phase}
              answered={answered}
              submitting={submitting}
              myAnswer={myAnswer}
            />
          </Card>
        ) : null}

        {(phase === "ranking" || phase === "finished") && myRank ? (
          <Card className="relative grid gap-3 overflow-hidden text-center">
            <ConfettiBurst active={soundSettings.visualEffectsEnabled && soundSettings.guestEffectsEnabled && myRank.rank <= 3} />
            <CardTitle>あなたの順位</CardTitle>
            <p className="text-5xl font-black text-[#13294b]">{myRank.rank}位</p>
            <p className="text-xl font-black text-[#d89a22]">{myRank.score}点</p>
          </Card>
        ) : null}

        {phase === "ranking" ? (
          <Card className="grid gap-4">
            <CardTitle>ランキング</CardTitle>
            <RankingList ranking={live.ranking} currentParticipantId={session.participantId} limit={10} />
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function StatusMessage({
  phase,
  answered,
  submitting,
  myAnswer,
}: {
  phase: Phase;
  answered: boolean;
  submitting: boolean;
  myAnswer: MyAnswer | null;
}) {
  if (submitting) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-4 font-black text-slate-700">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        送信中です
      </div>
    );
  }

  if (phase === "question") {
    return answered ? (
      <div className="grid gap-2 rounded-xl bg-[#d8f7eb] p-4 font-black text-[#075d4b]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          回答を受け付けました。
        </div>
        <p className="text-sm font-bold text-[#075d4b]">正解発表までお待ちください。</p>
        {myAnswer ? (
          <p className="rounded-lg bg-white/70 px-3 py-2 text-sm text-[#13294b]">
            あなたの回答: {String.fromCharCode(65 + myAnswer.selectedIndex)}
          </p>
        ) : null}
      </div>
    ) : (
      <p className="rounded-xl bg-[#fff6d8] p-4 text-sm font-black text-[#6d4b00]">
        1問につき回答は1回だけです。
      </p>
    );
  }

  if (phase === "closed") {
    return (
      <p className="rounded-xl bg-slate-100 p-4 text-sm font-black text-slate-700">
        回答は締め切られました。正解発表をお待ちください。
      </p>
    );
  }

  if (phase === "answer" || phase === "ranking" || phase === "finished") {
    if (!myAnswer) {
      return <p className="rounded-xl bg-slate-100 p-4 font-black text-slate-700">この問題は未回答です。</p>;
    }

    return (
      <div className="rounded-xl bg-white p-4 text-center shadow">
        <p className="text-sm font-black text-slate-500">あなたの結果</p>
        <p className="mt-1 text-2xl font-black text-[#13294b]">
          {myAnswer.isCorrect === null ? "集計中" : myAnswer.isCorrect ? "正解" : "惜しい！次の問題で取り返しましょう"}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-600">
          {myAnswer.point === null ? "点数は正解発表後に表示されます" : `${myAnswer.point}点 / ${myAnswer.responseMs}ms`}
        </p>
        {myAnswer.point !== null ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-left text-xs font-black text-slate-600">
            <div className="rounded-lg bg-[#fff6d8] p-2">
              基本得点<br />
              <span className="text-[#13294b]">{myAnswer.basePoints ?? 0}点</span>
            </div>
            <div className="rounded-lg bg-[#fff6d8] p-2">
              速度ボーナス<br />
              <span className="text-[#13294b]">+{myAnswer.speedBonus ?? 0}点</span>
            </div>
            <div className="rounded-lg bg-[#d8f7eb] p-2">
              今回の獲得点<br />
              <span className="text-[#075d4b]">{myAnswer.point}点</span>
            </div>
            <div className="rounded-lg bg-[#d8f7eb] p-2">
              累計得点<br />
              <span className="text-[#075d4b]">{myAnswer.totalScore ?? "-"}点</span>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return <p className="rounded-xl bg-slate-100 p-4 text-sm font-black text-slate-700">{phaseLabel(phase)}</p>;
}

function AvatarPicker({
  avatarUrl,
  disabled,
  onChange,
}: {
  avatarUrl: string | null;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/70 p-3">
      <div className="grid size-14 place-items-center overflow-hidden rounded-full bg-[var(--wql-accent-soft)] text-lg font-black text-[var(--wql-accent-text)]">
        {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <Camera className="size-6" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-slate-500">プロフィール画像（任意）</p>
        <p className="text-xs font-bold text-slate-500">JPEG / PNG / WebP、2MBまで</p>
      </div>
      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-[#d9b56d] bg-white px-3 text-sm font-black text-[var(--wql-text)]">
        選択
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function ParticipantAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--wql-accent-soft)] text-lg font-black text-[var(--wql-accent-text)]">
      {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : name.slice(0, 1)}
    </div>
  );
}
