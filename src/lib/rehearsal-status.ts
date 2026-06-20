import type { Phase } from "@/types/quiz";

export interface RehearsalStatusInput {
  totalAnswerCount: number;
  scoredParticipantCount: number;
  phase: Phase;
  eventStatus: "waiting" | "playing" | "finished";
}

export function hasRehearsalResults(input: RehearsalStatusInput): boolean {
  return input.totalAnswerCount > 0 || input.scoredParticipantCount > 0;
}

export function shouldConfirmBeforeStart(input: RehearsalStatusInput): boolean {
  return hasRehearsalResults(input) || input.phase !== "lobby" || input.eventStatus === "finished";
}
