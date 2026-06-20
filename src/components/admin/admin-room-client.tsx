"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clipboard,
  Eye,
  Flag,
  Play,
  RefreshCw,
  Save,
  Square,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import { useLiveRoom } from "@/lib/use-live-room";
import { normalizeRoomCode, phaseLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PhaseBadge } from "@/components/quiz/phase-badge";
import { AnswerDistributionChart } from "@/components/quiz/answer-distribution";
import { RankingList } from "@/components/quiz/ranking-list";
import { QRCodeBlock } from "@/components/quiz/qr-code-block";
import type { AdminAction, AdminQuestion, AdminSnapshot } from "@/types/quiz";

interface AdminRoomClientProps {
  roomCode: string;
  adminKey: string;
}

type QuestionFormState = Omit<AdminQuestion, "id"> & { id?: string };

const emptyQuestion: QuestionFormState = {
  orderNo: 0,
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  timeLimitSec: 10,
};

export function AdminRoomClient({ roomCode, adminKey }: AdminRoomClientProps) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const live = useLiveRoom(normalizedRoomCode);
  const [adminSnapshot, setAdminSnapshot] = useState<AdminSnapshot | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [clockMs, setClockMs] = useState(0);

  const phase = adminSnapshot?.liveState.phase ?? live.snapshot?.liveState.phase ?? "lobby";
  const currentQuestionId =
    adminSnapshot?.liveState.currentQuestionId ?? live.snapshot?.liveState.currentQuestionId;
  const questions = useMemo(() => adminSnapshot?.questions ?? [], [adminSnapshot?.questions]);
  const effectiveSelectedQuestionId = selectedQuestionId ?? questions[0]?.id ?? null;
  const selectedQuestion =
    questions.find((question) => question.id === effectiveSelectedQuestionId) ?? questions[0];
  const distribution = adminSnapshot?.distribution ?? live.distribution;
  const ranking = adminSnapshot?.ranking ?? live.ranking;
  const participantCount = adminSnapshot?.participantCount ?? live.snapshot?.participantCount ?? 0;
  const answeredCount = distribution?.total ?? 0;
  const adminAuthorized = Boolean(adminKey && adminSnapshot);
  const lastRefreshedLabel = live.lastRefreshedAt
    ? `${Math.max(0, Math.round(((clockMs || live.lastRefreshedAt) - live.lastRefreshedAt) / 1000))}秒前`
    : "未取得";

  const urls = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || origin || "";
    const encodedRoom = encodeURIComponent(normalizedRoomCode);
    const encodedKey = encodeURIComponent(adminKey);
    return {
      joinUrl: base ? `${base}/join/${encodedRoom}` : `/join/${encodedRoom}`,
      screenUrl: base ? `${base}/screen/${encodedRoom}` : `/screen/${encodedRoom}`,
      adminUrl: base ? `${base}/admin/${encodedRoom}?key=${encodedKey}` : `/admin/${encodedRoom}?key=${encodedKey}`,
    };
  }, [adminKey, normalizedRoomCode, origin]);

  const refreshAdmin = useCallback(async () => {
    try {
      setAdminError(null);
      const data = await fetchJson<AdminSnapshot>(
        `/api/admin/${encodeURIComponent(normalizedRoomCode)}/dashboard?key=${encodeURIComponent(adminKey)}`,
      );
      setAdminSnapshot(data);
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "管理画面の取得に失敗しました");
    }
  }, [adminKey, normalizedRoomCode]);

  useEffect(() => {
    const update = () => setClockMs(Date.now());
    const timer = setTimeout(update, 0);
    const interval = setInterval(update, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshAdmin();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshAdmin();
    }, 0);

    return () => clearTimeout(timer);
  }, [
    refreshAdmin,
    live.snapshot?.liveState.updatedAt,
    live.snapshot?.participantCount,
    live.snapshot?.totalAnswerCount,
  ]);

  async function runControl(action: AdminAction, questionId?: string) {
    if (!adminAuthorized) {
      setAdminError("管理キーを確認できないため、操作を停止しました。主催者URLを開き直してください。");
      return;
    }

    if (action === "reveal_answer" && !confirmReveal(answeredCount, participantCount)) {
      return;
    }

    if (action === "show_ranking") {
      await Promise.all([live.refresh(), refreshAdmin()]);
      if (!window.confirm("最新状態を再取得しました。ランキングを表示しますか？")) {
        return;
      }
    }

    if (action === "close_question" && answeredCount === 0) {
      if (!window.confirm("回答数が0です。このまま締め切りますか？")) {
        return;
      }
    }

    if (action === "finish_event" && !confirmFinish(normalizedRoomCode)) {
      return;
    }

    try {
      setBusy(action);
      setAdminError(null);
      await fetchJson<unknown>("/api/admin/control", {
        method: "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          adminKey,
          action,
          questionId,
        }),
      });
      await Promise.all([live.refresh(), refreshAdmin()]);
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "操作に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function saveQuestion(question: QuestionFormState) {
    try {
      setBusy(question.id ? `save-${question.id}` : "save-new");
      setAdminError(null);
      await fetchJson<AdminQuestion>("/api/admin/questions", {
        method: question.id ? "PUT" : "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          adminKey,
          question,
        }),
      });
      await refreshAdmin();
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "問題の保存に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (!window.confirm("この問題を削除します。よろしいですか？")) {
      return;
    }

    try {
      setBusy(`delete-${questionId}`);
      setAdminError(null);
      await fetchJson<unknown>("/api/admin/questions", {
        method: "DELETE",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          adminKey,
          questionId,
        }),
      });
      setSelectedQuestionId(null);
      await refreshAdmin();
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "問題の削除に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function moveQuestion(questionId: string, direction: -1 | 1) {
    const index = questions.findIndex((question) => question.id === questionId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= questions.length) {
      return;
    }

    const nextIds = questions.map((question) => question.id);
    const [moved] = nextIds.splice(index, 1);
    nextIds.splice(targetIndex, 0, moved);

    try {
      setBusy(`move-${questionId}`);
      setAdminError(null);
      await fetchJson<unknown>("/api/admin/questions", {
        method: "PATCH",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          adminKey,
          questionIds: nextIds,
        }),
      });
      await refreshAdmin();
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "並び替えに失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text);
  }

  const canStart =
    adminAuthorized &&
    Boolean(selectedQuestion) &&
    phase !== "question" &&
    phase !== "finished" &&
    !(currentQuestionId === selectedQuestion?.id && ["closed", "answer", "ranking"].includes(phase));
  const canClose = adminAuthorized && phase === "question";
  const canReveal = adminAuthorized && phase === "closed";
  const canShowRanking = adminAuthorized && phase === "answer";
  const canFinish = adminAuthorized && phase !== "finished";

  if (live.loading && !adminSnapshot) {
    return (
      <main className="min-h-screen bg-[#fff8e7] p-6">
        <LoadingState label="管理画面を読み込み中です" />
      </main>
    );
  }

  if (!adminAuthorized && adminError) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_42%,#ffe1ea_72%,#dfe9ff_100%)] px-4 py-8 text-[#13294b]">
        <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-2xl content-center gap-5">
          <Card className="grid gap-4">
            <CardTitle>管理者確認が必要です</CardTitle>
            <ErrorMessage message={adminError} />
            <p className="text-sm font-bold leading-6 text-slate-700">
              adminKey がない、または正しくありません。ゲストに共有するURLは
              <span className="font-black"> /join/{normalizedRoomCode} </span>
              です。主催者URLをゲストに共有してしまった場合は、このイベントを作り直してください。
            </p>
            <Button variant="secondary" onClick={() => window.location.assign("/admin")}>
              イベント作成画面へ
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_42%,#ffe1ea_72%,#dfe9ff_100%)] px-4 py-6 text-[#13294b]">
      <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="grid content-start gap-5">
          <Card className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-500">roomCode</p>
                <h1 className="text-4xl font-black">{normalizedRoomCode}</h1>
              </div>
              <PhaseBadge phase={phase} large />
            </div>
            <p className="text-sm font-bold text-slate-600">
              次の操作: <span className="text-[#13294b]">{nextOperationLabel(phase)}</span>
            </p>
            <div className="rounded-xl bg-[#fff6d8] p-3 text-sm font-black leading-6 text-[#6d4b00]">
              この画面は主催者専用です。プロジェクター投影やゲスト共有は禁止です。
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
                onClick={() => selectedQuestion && runControl("start_question", selectedQuestion.id)}
              >
                問題開始
              </Button>
              <Button
                size="lg"
                variant="danger"
                icon={<Square className="size-5" aria-hidden="true" />}
                disabled={!canClose || busy !== null}
                onClick={() => runControl("close_question")}
              >
                回答締切
              </Button>
              <Button
                size="lg"
                variant="success"
                icon={<Eye className="size-5" aria-hidden="true" />}
                disabled={!canReveal || busy !== null}
                onClick={() => runControl("reveal_answer")}
              >
                正解発表
              </Button>
              <Button
                size="lg"
                variant="secondary"
                icon={<Trophy className="size-5" aria-hidden="true" />}
                disabled={!canShowRanking || busy !== null}
                onClick={() => runControl("show_ranking")}
              >
                ランキング表示
              </Button>
              <Button
                size="lg"
                variant="ghost"
                icon={<Flag className="size-5" aria-hidden="true" />}
                disabled={!canFinish || busy !== null}
                onClick={() => runControl("finish_event")}
              >
                イベント終了
              </Button>
            </div>
            <Button
              variant="ghost"
              icon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={() => Promise.all([live.refresh(), refreshAdmin()])}
              disabled={busy !== null}
            >
              最新状態に更新（{lastRefreshedLabel}）
            </Button>
          </Card>

          <Card className="grid gap-4">
            <CardTitle>参加案内</CardTitle>
            <QRCodeBlock value={urls.joinUrl} label="参加URL" />
            <UrlCopy label="参加URL" value={urls.joinUrl} onCopy={copy} />
            <UrlCopy label="スクリーンURL" value={urls.screenUrl} onCopy={copy} />
            <UrlCopy label="主催者URL" value={urls.adminUrl} onCopy={copy} secret roomCode={normalizedRoomCode} />
          </Card>
        </aside>

        <section className="grid content-start gap-5">
          {(adminError || live.error) ? (
            <ErrorMessage message={adminError ?? live.error ?? ""} />
          ) : null}

          <Card className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>現在の問題</CardTitle>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  phase: {phaseLabel(phase)} / 接続: {live.realtimeStatus} / 最終取得: {lastRefreshedLabel}
                </p>
              </div>
              <select
                value={effectiveSelectedQuestionId ?? ""}
                onChange={(event) => setSelectedQuestionId(event.target.value)}
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
              <EmptyState title="問題がありません" description="下のフォームから問題を追加してください。" />
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

          <Card className="grid gap-4">
            <CardTitle>問題管理</CardTitle>
            <QuestionEditor
              key={`new-question-${questions.length}`}
              title="新しい問題"
              initial={emptyQuestion}
              busy={busy === "save-new"}
              onSave={saveQuestion}
            />
            <div className="grid gap-4">
              {questions.map((question, index) => (
                <QuestionEditor
                  key={`${question.id}-${question.orderNo}-${question.text}-${question.options.join("|")}-${question.correctIndex}-${question.timeLimitSec}`}
                  title={`Q${question.orderNo}`}
                  initial={question}
                  busy={busy === `save-${question.id}` || busy === `delete-${question.id}` || busy === `move-${question.id}`}
                  onSave={saveQuestion}
                  onDelete={() => deleteQuestion(question.id)}
                  onMoveUp={index === 0 ? undefined : () => moveQuestion(question.id, -1)}
                  onMoveDown={index === questions.length - 1 ? undefined : () => moveQuestion(question.id, 1)}
                />
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <span className="text-xs font-black">{label}</span>
      </div>
      <p className="mt-1 text-3xl font-black text-[#13294b]">{value}</p>
    </div>
  );
}

function UrlCopy({
  label,
  value,
  secret = false,
  roomCode,
  onCopy,
}: {
  label: string;
  value: string;
  secret?: boolean;
  roomCode?: string;
  onCopy: (value: string) => Promise<void>;
}) {
  async function handleCopy() {
    if (secret) {
      const accepted = window.confirm(
        "主催者URLには管理権限が含まれます。ゲストやスクリーンに共有しない前提でコピーしますか？",
      );
      if (!accepted) {
        return;
      }
    }
    await onCopy(value);
  }

  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 bg-white/80 p-3">
      <p className="text-xs font-black text-slate-500">{label}{secret ? "（非共有）" : ""}</p>
      <p className="break-all text-sm font-bold text-[#13294b]">
        {secret ? `管理権限付きURLです。表示せずにコピーのみ許可します。roomCode: ${roomCode ?? ""}` : value}
      </p>
      <Button
        size="sm"
        variant="secondary"
        icon={<Clipboard className="size-4" aria-hidden="true" />}
        onClick={handleCopy}
      >
        コピー
      </Button>
    </div>
  );
}

function QuestionEditor({
  title,
  initial,
  busy,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  title: string;
  initial: QuestionFormState;
  busy: boolean;
  onSave: (question: QuestionFormState) => Promise<void>;
  onDelete?: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<QuestionFormState>(initial);

  function updateOption(index: number, value: string) {
    const nextOptions: [string, string, string, string] = [
      draft.options[0],
      draft.options[1],
      draft.options[2],
      draft.options[3],
    ];
    nextOptions[index] = value;
    setDraft({ ...draft, options: nextOptions });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[#d9b56d]/45 bg-white/75 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-black text-[#13294b]">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {onMoveUp ? (
            <Button size="sm" variant="ghost" icon={<ArrowUp className="size-4" />} onClick={onMoveUp} disabled={busy}>
              上へ
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button size="sm" variant="ghost" icon={<ArrowDown className="size-4" />} onClick={onMoveDown} disabled={busy}>
              下へ
            </Button>
          ) : null}
          {onDelete ? (
            <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={onDelete} disabled={busy}>
              削除
            </Button>
          ) : null}
          <Button size="sm" icon={<Save className="size-4" />} onClick={() => onSave(draft)} disabled={busy}>
            保存
          </Button>
        </div>
      </div>

      <textarea
        value={draft.text}
        onChange={(event) => setDraft({ ...draft, text: event.target.value })}
        rows={2}
        className="min-h-20 rounded-xl border border-slate-200 bg-white p-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
        placeholder="問題文"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {draft.options.map((option, index) => (
          <label key={index} className="grid gap-1 rounded-xl bg-white/70 p-3">
            <span className="text-xs font-black text-slate-500">
              {String.fromCharCode(65 + index)} 選択肢
            </span>
            <input
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              className="min-h-11 rounded-lg border border-slate-200 px-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
            />
            <label className="mt-1 flex items-center gap-2 text-sm font-bold text-[#13294b]">
              <input
                type="radio"
                checked={draft.correctIndex === index}
                onChange={() => setDraft({ ...draft, correctIndex: index })}
              />
              正解にする
            </label>
          </label>
        ))}
      </div>

      <label className="grid gap-1 sm:max-w-xs">
        <span className="text-xs font-black text-slate-500">制限時間（秒）</span>
        <input
          type="number"
          min={5}
          max={60}
          value={draft.timeLimitSec}
          onChange={(event) =>
            setDraft({ ...draft, timeLimitSec: Number(event.target.value) })
          }
          className="min-h-11 rounded-lg border border-slate-200 px-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
        />
      </label>
    </div>
  );
}

function nextOperationLabel(phase: string): string {
  if (phase === "lobby" || phase === "ranking" || phase === "answer" || phase === "closed") {
    return phase === "closed" ? "正解発表" : phase === "answer" ? "ランキング表示" : "問題開始";
  }
  if (phase === "question") {
    return "回答締切";
  }
  return "リハーサル完了";
}

function confirmReveal(answeredCount: number, participantCount: number): boolean {
  if (participantCount === 0) {
    return window.confirm("参加者が0人です。このまま正解発表しますか？");
  }

  if (answeredCount === 0) {
    return window.confirm("回答数が0です。このまま正解発表しますか？");
  }

  if (answeredCount < participantCount) {
    return window.confirm(
      `回答数が参加者数より少ないです（${answeredCount}/${participantCount}）。未回答者がいても正解発表しますか？`,
    );
  }

  return true;
}

function confirmFinish(roomCode: string): boolean {
  const input = window.prompt(
    `イベントを終了します。取り消しできません。確認のため roomCode「${roomCode}」を入力してください。`,
  );
  return input?.trim().toUpperCase() === roomCode;
}
