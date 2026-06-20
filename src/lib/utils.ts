import type { Phase } from "@/types/quiz";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "通信に失敗しました。時間をおいてもう一度お試しください。";
}

export function phaseLabel(phase: Phase): string {
  const labels: Record<Phase, string> = {
    lobby: "待機中",
    question: "回答受付中",
    closed: "回答締切",
    answer: "正解発表",
    ranking: "ランキング",
    finished: "終了",
  };

  return labels[phase];
}

export function isRevealPhase(phase: Phase): boolean {
  return phase === "answer" || phase === "ranking" || phase === "finished";
}

export function isRankingPhase(phase: Phase): boolean {
  return phase === "ranking" || phase === "finished";
}

export function secondsRemaining(startedAt: string | null, limitSec: number, nowMs = Date.now()): number {
  if (!startedAt) {
    return 0;
  }

  const startMs = new Date(startedAt).getTime();
  const endMs = startMs + limitSec * 1000;
  return clamp(Math.ceil((endMs - nowMs) / 1000), 0, limitSec);
}
