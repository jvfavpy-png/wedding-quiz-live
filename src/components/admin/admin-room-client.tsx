"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import { adminPasswordPlaceholders, minAdminPasswordLength } from "@/lib/admin-password";
import { resolveAppBaseUrl, buildPublicRoomUrls } from "@/lib/app-url";
import { shouldConfirmBeforeStart } from "@/lib/rehearsal-status";
import { useLiveRoom } from "@/lib/use-live-room";
import { normalizeRoomCode, phaseLabel } from "@/lib/utils";
import {
  AdminTabs,
  readAdminTab,
  writeAdminTab,
  type AdminTabId,
} from "@/components/admin/admin-tabs";
import { AdminProgressTab } from "@/components/admin/admin-progress-tab";
import { AdminQuestionsTab } from "@/components/admin/admin-questions-tab";
import { AdminUrlsTab } from "@/components/admin/admin-urls-tab";
import { AdminRehearsalTab } from "@/components/admin/admin-rehearsal-tab";
import { AdminSettingsTab } from "@/components/admin/admin-settings-tab";
import type { QuestionFormState } from "@/components/admin/admin-room-shared";
import { PhaseBadge } from "@/components/quiz/phase-badge";
import { ConnectionStatus } from "@/components/quiz/connection-status";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { LoadingState } from "@/components/ui/loading-state";
import type { AdminAction, AdminQuestion, AdminSnapshot } from "@/types/quiz";

interface AdminRoomClientProps {
  roomCode: string;
  legacyKey?: string;
}

const pretestChecklistItems = [
  "イベント名を設定した",
  "問題を1問以上作成した",
  "参加URLをスマホで開けた",
  "スクリーンURLを開けた",
  "回答・得点をリセットした",
  "管理URLを友人に送らないことを確認した",
  "友人には参加URLだけ送る",
  "問題開始からランキング表示まで1回通した",
];

export function AdminRoomClient({ roomCode, legacyKey = "" }: AdminRoomClientProps) {
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const live = useLiveRoom(normalizedRoomCode);
  const [adminSnapshot, setAdminSnapshot] = useState<AdminSnapshot | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [legacyAuthTried, setLegacyAuthTried] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [activeTab, setActiveTab] = useState<AdminTabId>(() => readAdminTab(normalizedRoomCode));
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [pretestChecks, setPretestChecks] = useState<boolean[]>(() =>
    readPretestChecks(normalizedRoomCode),
  );
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
  const adminAuthorized = Boolean(adminSnapshot);
  const editingLocked = phase === "question";
  const lastRefreshedLabel = live.lastRefreshedAt
    ? `${Math.max(0, Math.round(((clockMs || live.lastRefreshedAt) - live.lastRefreshedAt) / 1000))}秒前`
    : "未取得";

  const urls = useMemo(() => {
    return buildPublicRoomUrls(resolveAppBaseUrl({ windowOrigin: origin }), normalizedRoomCode);
  }, [normalizedRoomCode, origin]);

  const refreshAdmin = useCallback(async () => {
    try {
      setAdminError(null);
      const data = await fetchJson<AdminSnapshot>(
        `/api/admin/${encodeURIComponent(normalizedRoomCode)}/dashboard`,
      );
      setAdminSnapshot(data);
      setEventTitle(data.event.title);
      setNeedsPassword(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "管理画面の取得に失敗しました";
      setAdminError(message);
      setNeedsPassword(message.includes("認証") || message.includes("パスワード"));
    }
  }, [normalizedRoomCode]);

  const authenticateAdmin = useCallback(async (input: { password?: string; legacyKey?: string }) => {
    try {
      setAuthenticating(true);
      setAdminError(null);
      await fetchJson<{ ok: true }>("/api/admin/auth", {
        method: "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          ...input,
        }),
      });
      setPassword("");
      setNeedsPassword(false);
      if (input.legacyKey && typeof window !== "undefined") {
        window.history.replaceState(null, "", `/admin/${encodeURIComponent(normalizedRoomCode)}`);
      }
      await refreshAdmin();
    } catch (caught) {
      setNeedsPassword(true);
      setAdminError(caught instanceof Error ? caught.message : "管理者用パスワードを確認できませんでした");
    } finally {
      setAuthenticating(false);
    }
  }, [normalizedRoomCode, refreshAdmin]);

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
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(pretestStorageKey(normalizedRoomCode), JSON.stringify(pretestChecks));
  }, [normalizedRoomCode, pretestChecks]);

  useEffect(() => {
    writeAdminTab(normalizedRoomCode, activeTab);
  }, [activeTab, normalizedRoomCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshAdmin();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshAdmin]);

  useEffect(() => {
    if (!legacyKey || legacyAuthTried || adminSnapshot) {
      return;
    }

    const timer = setTimeout(() => {
      setLegacyAuthTried(true);
      void authenticateAdmin({ legacyKey });
    }, 0);

    return () => clearTimeout(timer);
  }, [adminSnapshot, authenticateAdmin, legacyAuthTried, legacyKey]);

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

  async function saveEventTitle() {
    if (!adminAuthorized) {
      setAdminError("管理者用パスワードの認証が必要です。もう一度入力してください。");
      setNeedsPassword(true);
      return;
    }

    const title = eventTitle.trim();
    if (!title) {
      setAdminError("イベント名を入力してください。");
      return;
    }

    if (title.length > 80) {
      setAdminError("イベント名は80文字以内で入力してください。");
      return;
    }

    try {
      setBusy("save-event");
      setAdminError(null);
      setNotice(null);
      await fetchJson<unknown>("/api/admin/events", {
        method: "PATCH",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          title,
        }),
      });
      setNotice("イベント名を保存しました。URLとroomCodeは変わりません。");
      await Promise.all([live.refresh(), refreshAdmin()]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "イベント名の保存に失敗しました";
      setAdminError(message);
      if (message.includes("認証")) {
        setNeedsPassword(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function changeAdminPassword() {
    if (!adminAuthorized) {
      setAdminError("管理者用パスワードの認証が必要です。もう一度入力してください。");
      setNeedsPassword(true);
      return;
    }

    try {
      setBusy("change-password");
      setAdminError(null);
      setNotice(null);
      await fetchJson<{ ok: true }>("/api/admin/password", {
        method: "PATCH",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          ...passwordForm,
        }),
      });
      setPasswordForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      setNotice("管理者用パスワードを変更しました。参加URLとスクリーンURLは変わりません。");
      await refreshAdmin();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "管理者用パスワードの変更に失敗しました";
      setAdminError(message);
      if (message.includes("認証")) {
        setNeedsPassword(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function runControl(action: AdminAction, questionId?: string) {
    if (!adminAuthorized) {
      setAdminError("管理者用パスワードの認証が必要です。もう一度入力してください。");
      setNeedsPassword(true);
      return;
    }

    if (action === "reset_run" && !confirmReset(normalizedRoomCode)) {
      return;
    }

    if (action === "reopen_event") {
      const message =
        phase === "finished"
          ? "イベント終了状態を解除し、待機状態に戻しますか？"
          : "現在の進行表示を待機状態に戻しますか？回答・得点は残ります。";
      if (!window.confirm(message)) {
        return;
      }
    }

    if (
      action === "start_question" &&
      adminSnapshot &&
      shouldConfirmBeforeStart({
        totalAnswerCount: adminSnapshot.totalAnswerCount,
        scoredParticipantCount: adminSnapshot.scoredParticipantCount,
        phase,
        eventStatus: adminSnapshot.event.status,
      })
    ) {
      const accepted = window.confirm(
        "リハーサル結果が残っている可能性があります。このまま開始しますか？本番前は、回答・得点をリセットしてから始めると安心です。",
      );
      if (!accepted) {
        return;
      }
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
      setNotice(null);
      await fetchJson<unknown>("/api/admin/control", {
        method: "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          action,
          questionId,
        }),
      });
      if (action === "reset_run") {
        setSelectedQuestionId(null);
        setNotice("回答・得点をリセットしました。問題、イベント名、URLは残っています。");
      } else if (action === "reopen_event") {
        setNotice("イベントを待機状態に戻しました。");
      }
      await Promise.all([live.refresh(), refreshAdmin()]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "操作に失敗しました";
      setAdminError(message);
      if (message.includes("認証")) {
        setNeedsPassword(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveQuestion(question: QuestionFormState) {
    if (editingLocked) {
      setAdminError("回答受付中は問題編集できません。先に回答を締め切ってください。");
      return;
    }

    try {
      setBusy(question.id ? `save-${question.id}` : "save-new");
      setAdminError(null);
      setNotice(null);
      await fetchJson<AdminQuestion>("/api/admin/questions", {
        method: question.id ? "PUT" : "POST",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          question,
        }),
      });
      setNotice("問題を保存しました。");
      await refreshAdmin();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "問題の保存に失敗しました";
      setAdminError(message);
      if (message.includes("認証")) {
        setNeedsPassword(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function deleteQuestion(questionId: string) {
    if (editingLocked) {
      setAdminError("回答受付中は問題削除できません。先に回答を締め切ってください。");
      return;
    }

    if (!window.confirm("この問題を削除します。よろしいですか？")) {
      return;
    }

    try {
      setBusy(`delete-${questionId}`);
      setAdminError(null);
      setNotice(null);
      await fetchJson<unknown>("/api/admin/questions", {
        method: "DELETE",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          questionId,
        }),
      });
      setSelectedQuestionId(null);
      setNotice("問題を削除しました。");
      await refreshAdmin();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "問題の削除に失敗しました";
      setAdminError(message);
      if (message.includes("認証")) {
        setNeedsPassword(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function moveQuestion(questionId: string, direction: -1 | 1) {
    if (editingLocked) {
      setAdminError("回答受付中は問題の順番を変更できません。先に回答を締め切ってください。");
      return;
    }

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
      setNotice(null);
      await fetchJson<unknown>("/api/admin/questions", {
        method: "PATCH",
        body: JSON.stringify({
          roomCode: normalizedRoomCode,
          questionIds: nextIds,
        }),
      });
      setNotice("問題の順番を更新しました。");
      await refreshAdmin();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "並び替えに失敗しました";
      setAdminError(message);
      if (message.includes("認証")) {
        setNeedsPassword(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text);
  }

  function changeTab(tabId: AdminTabId) {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
  const canReopen = adminAuthorized && phase === "finished";
  const canReset = adminAuthorized;

  if (live.loading && !adminSnapshot) {
    return (
      <main className="min-h-screen bg-[#fff8e7] p-6">
        <LoadingState label="管理画面を読み込み中です" />
      </main>
    );
  }

  if (needsPassword || (!adminAuthorized && adminError)) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_42%,#ffe1ea_72%,#dfe9ff_100%)] px-4 py-8 text-[#13294b]">
        <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-2xl content-center gap-5">
          <Card className="grid gap-4">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff6d8] text-[#6d4b00]">
              <KeyRound className="size-7" aria-hidden="true" />
            </div>
            <CardTitle className="text-center">管理者用パスワードを入力してください</CardTitle>
            {adminError ? <ErrorMessage message={adminError} /> : null}
            <p className="text-center text-sm font-bold leading-6 text-slate-700">
              この画面では、問題の編集や進行操作を行います。管理者用パスワードはゲストには共有しないでください。
            </p>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void authenticateAdmin({ password });
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-14 rounded-xl border border-[#d9b56d]/60 bg-white px-4 text-lg font-bold outline-none ring-[#d9b56d] placeholder:text-slate-400 focus:ring-4"
                placeholder={adminPasswordPlaceholders.password}
                autoComplete="current-password"
              />
              <Button
                size="lg"
                icon={<KeyRound className="size-5" aria-hidden="true" />}
                disabled={authenticating || password.length < minAdminPasswordLength}
              >
                {authenticating ? "確認中" : "管理画面を開く"}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_42%,#ffe1ea_72%,#dfe9ff_100%)] px-4 py-6 text-[#13294b]">
      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="grid gap-4 rounded-3xl border border-white/70 bg-white/88 p-5 shadow-xl shadow-[#13294b]/10 backdrop-blur lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-500">管理画面 / roomCode {normalizedRoomCode}</p>
            <h1 className="mt-1 break-words text-3xl font-black leading-tight text-[#13294b]">
              {adminSnapshot?.event.title ?? "Wedding Quiz Live"}
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              現在の状態: <span className="font-black text-[#13294b]">{phaseLabel(phase)}</span> / 接続: {live.realtimeStatus}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <PhaseBadge phase={phase} large />
            <div className="rounded-xl bg-white/80 px-3 py-2 text-sm font-black text-[#13294b]">
              参加者 {participantCount} / 回答 {answeredCount}
            </div>
            <Button
              variant="ghost"
              icon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={() => Promise.all([live.refresh(), refreshAdmin()])}
              disabled={busy !== null}
            >
              更新
            </Button>
          </div>
        </header>

        <div className="sticky top-0 z-20 -mx-4 bg-[#fff8e7]/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
          <AdminTabs activeTab={activeTab} onChange={changeTab} />
        </div>

        <ConnectionStatus
          status={live.realtimeStatus}
          error={live.error}
          lastRefreshedLabel={lastRefreshedLabel}
          onRefresh={() => Promise.all([live.refresh(), refreshAdmin()])}
        />

        {(adminError || live.error) ? (
          adminError ? <ErrorMessage message={adminError} /> : null
        ) : null}

        {notice ? (
          <div className="rounded-2xl bg-[#d8f7eb] p-4 text-sm font-black leading-6 text-[#075d4b] shadow">
            {notice}
          </div>
        ) : null}

        {activeTab === "progress" ? (
          <AdminProgressTab
            normalizedRoomCode={normalizedRoomCode}
            phase={phase}
            participantCount={participantCount}
            answeredCount={answeredCount}
            totalAnswerCount={adminSnapshot?.totalAnswerCount ?? 0}
            scoredParticipantCount={adminSnapshot?.scoredParticipantCount ?? 0}
            hasRehearsalResults={adminSnapshot?.hasRehearsalResults ?? false}
            selectedQuestion={selectedQuestion}
            questions={questions}
            effectiveSelectedQuestionId={effectiveSelectedQuestionId}
            distribution={distribution}
            ranking={ranking}
            realtimeStatus={live.realtimeStatus}
            lastRefreshedLabel={lastRefreshedLabel}
            busy={busy}
            canStart={canStart}
            canClose={canClose}
            canReveal={canReveal}
            canShowRanking={canShowRanking}
            canReset={canReset}
            onSelectQuestion={(questionId) => setSelectedQuestionId(questionId || null)}
            onControl={runControl}
            onRefresh={() => Promise.all([live.refresh(), refreshAdmin()])}
          />
        ) : null}

        {activeTab === "questions" ? (
          <AdminQuestionsTab
            questions={questions}
            editingLocked={editingLocked}
            busy={busy}
            onSaveQuestion={saveQuestion}
            onDeleteQuestion={deleteQuestion}
            onMoveQuestion={moveQuestion}
          />
        ) : null}

        {activeTab === "urls" ? (
          <AdminUrlsTab urls={urls} roomCode={normalizedRoomCode} onCopy={copy} />
        ) : null}

        {activeTab === "rehearsal" ? (
          <AdminRehearsalTab
            urls={urls}
            busy={busy}
            adminAuthorized={adminAuthorized}
            canReset={canReset}
            hasRehearsalResults={adminSnapshot?.hasRehearsalResults ?? false}
            checklistItems={pretestChecklistItems}
            pretestChecks={pretestChecks}
            onPretestChange={setPretestChecks}
            onControl={runControl}
          />
        ) : null}

        {activeTab === "settings" ? (
          <AdminSettingsTab
            phase={phase}
            eventTitle={eventTitle}
            editingLocked={editingLocked}
            adminAuthorized={adminAuthorized}
            busy={busy}
            passwordForm={passwordForm}
            canFinish={canFinish}
            canReopen={canReopen}
            canReset={canReset}
            onEventTitleChange={setEventTitle}
            onSaveEventTitle={saveEventTitle}
            onPasswordFormChange={setPasswordForm}
            onChangeAdminPassword={changeAdminPassword}
            onControl={runControl}
          />
        ) : null}
      </div>
    </main>
  );
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
    `イベントを終了状態にします。確認のため roomCode「${roomCode}」を入力してください。`,
  );
  return input?.trim().toUpperCase() === roomCode;
}

function confirmReset(roomCode: string): boolean {
  const input = window.prompt(
    `回答・得点だけをリセットします。イベント名・問題・URLは残ります。確認のため roomCode「${roomCode}」を入力してください。`,
  );
  return input?.trim().toUpperCase() === roomCode;
}

function pretestStorageKey(roomCode: string): string {
  return `wql-pretest-${roomCode}`;
}

function readPretestChecks(roomCode: string): boolean[] {
  if (typeof window === "undefined") {
    return pretestChecklistItems.map(() => false);
  }

  try {
    const raw = window.localStorage.getItem(pretestStorageKey(roomCode));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) {
      return pretestChecklistItems.map((_, index) => parsed[index] === true);
    }
  } catch {
    window.localStorage.removeItem(pretestStorageKey(roomCode));
  }

  return pretestChecklistItems.map(() => false);
}
