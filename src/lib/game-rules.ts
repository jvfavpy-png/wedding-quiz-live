import { calculatePoint } from "@/lib/scoring";
import type { Phase } from "@/types/quiz";

export class QuizRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizRuleError";
  }
}

export interface RuleParticipant {
  id: string;
  eventId: string;
  participantToken: string;
  score: number;
}

export interface RuleQuestion {
  id: string;
  eventId: string;
  correctIndex: number;
  timeLimitSec: number;
}

export interface RuleLiveState {
  phase: Phase;
  currentQuestionId: string | null;
  questionStartedAtMs: number | null;
}

export interface ExistingAnswerKey {
  questionId: string;
  participantId: string;
}

export interface SubmitAnswerRuleInput {
  eventId: string;
  eventStatus: "waiting" | "playing" | "finished";
  participant: RuleParticipant | null;
  participantToken: string;
  question: RuleQuestion | null;
  liveState: RuleLiveState;
  selectedIndex: number;
  existingAnswers: ExistingAnswerKey[];
  nowMs: number;
}

export interface SubmitAnswerRuleResult {
  selectedIndex: number;
  responseMs: number;
  isCorrect: boolean;
  point: number;
  nextScore: number;
}

export function evaluateSubmitAnswer(input: SubmitAnswerRuleInput): SubmitAnswerRuleResult {
  if (![0, 1, 2, 3].includes(input.selectedIndex)) {
    throw new QuizRuleError("回答の選択肢が不正です");
  }

  if (input.eventStatus === "finished") {
    throw new QuizRuleError("このイベントは終了しています");
  }

  if (!input.participant || input.participant.eventId !== input.eventId) {
    throw new QuizRuleError("参加情報を確認できません。再参加してください");
  }

  if (input.participant.participantToken !== input.participantToken) {
    throw new QuizRuleError("参加情報を確認できません。再参加してください");
  }

  if (!input.question || input.question.eventId !== input.eventId) {
    throw new QuizRuleError("問題が見つかりません");
  }

  if (input.liveState.phase !== "question") {
    throw new QuizRuleError("現在は回答受付中ではありません");
  }

  if (input.liveState.currentQuestionId !== input.question.id) {
    throw new QuizRuleError("現在の問題と回答対象が一致しません");
  }

  if (input.liveState.questionStartedAtMs === null) {
    throw new QuizRuleError("問題開始時刻が未設定です");
  }

  const responseMs = Math.max(0, input.nowMs - input.liveState.questionStartedAtMs);
  if (responseMs > input.question.timeLimitSec * 1000) {
    throw new QuizRuleError("回答時間を過ぎています");
  }

  const alreadyAnswered = input.existingAnswers.some(
    (answer) =>
      answer.questionId === input.question?.id &&
      answer.participantId === input.participant?.id,
  );
  if (alreadyAnswered) {
    throw new QuizRuleError("すでに回答済みです");
  }

  const isCorrect = input.question.correctIndex === input.selectedIndex;
  const point = calculatePoint(isCorrect, responseMs);

  return {
    selectedIndex: input.selectedIndex,
    responseMs,
    isCorrect,
    point,
    nextScore: input.participant.score + point,
  };
}

export function assertAdminKeyMatches(actual: string, expected: string): void {
  if (!actual || actual !== expected) {
    throw new QuizRuleError("管理キーが正しくありません");
  }
}

export function nextPhaseForAdminAction(
  phase: Phase,
  action: "start_question" | "close_question" | "reveal_answer" | "show_ranking" | "finish_event",
): Phase {
  if (action === "finish_event") {
    return "finished";
  }

  if (action === "start_question") {
    if (phase === "question" || phase === "finished") {
      throw new QuizRuleError("現在の状態では問題開始できません");
    }
    return "question";
  }

  if (action === "close_question") {
    if (phase !== "question") {
      throw new QuizRuleError("回答受付中の問題がありません");
    }
    return "closed";
  }

  if (action === "reveal_answer") {
    if (phase !== "closed") {
      throw new QuizRuleError("先に回答を締め切ってください");
    }
    return "answer";
  }

  if (phase !== "answer") {
    throw new QuizRuleError("先に正解を発表してください");
  }
  return "ranking";
}
