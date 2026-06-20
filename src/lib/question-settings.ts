import type { QuestionDifficulty } from "@/types/quiz";

export const questionDifficulties: QuestionDifficulty[] = [
  "easy",
  "normal",
  "hard",
  "special",
  "final",
];

export const difficultyLabels: Record<QuestionDifficulty, string> = {
  easy: "かんたん",
  normal: "ふつう",
  hard: "むずかしい",
  special: "特別問題",
  final: "最終問題",
};

export const defaultBasePointsByDifficulty: Record<QuestionDifficulty, number> = {
  easy: 50,
  normal: 100,
  hard: 150,
  special: 200,
  final: 300,
};

export const minBasePoints = 10;
export const maxBasePoints = 1000;

export function isQuestionDifficulty(value: unknown): value is QuestionDifficulty {
  return typeof value === "string" && questionDifficulties.includes(value as QuestionDifficulty);
}

export function normalizeQuestionDifficulty(value: unknown): QuestionDifficulty {
  return isQuestionDifficulty(value) ? value : "normal";
}

export function defaultBasePointsForDifficulty(difficulty: QuestionDifficulty): number {
  return defaultBasePointsByDifficulty[difficulty];
}

export function validateBasePoints(basePoints: number): void {
  if (!Number.isInteger(basePoints) || basePoints < minBasePoints || basePoints > maxBasePoints) {
    throw new Error(`基本得点は${minBasePoints}〜${maxBasePoints}点で設定してください`);
  }
}
