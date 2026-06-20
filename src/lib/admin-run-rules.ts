import type { Phase } from "@/types/quiz";

export interface ResetRunQuestion {
  id: string;
  basePoints: number;
}

export interface ResetRunParticipant {
  id: string;
  score: number;
}

export interface ResetRunState {
  questions: ResetRunQuestion[];
  answers: unknown[];
  participants: ResetRunParticipant[];
  liveState: {
    phase: Phase;
    currentQuestionId: string | null;
    questionStartedAt: string | null;
  };
  eventStatus: "waiting" | "playing" | "finished";
}

export function resetRunState(state: ResetRunState): ResetRunState {
  return {
    ...state,
    questions: state.questions.map((question) => ({ ...question })),
    answers: [],
    participants: state.participants.map((participant) => ({
      ...participant,
      score: 0,
    })),
    liveState: {
      phase: "lobby",
      currentQuestionId: null,
      questionStartedAt: null,
    },
    eventStatus: "waiting",
  };
}

export function updateEventTitle(currentRoomCode: string, title: string): {
  roomCode: string;
  title: string;
} {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("イベント名を入力してください");
  }
  if (trimmedTitle.length > 80) {
    throw new Error("イベント名は80文字以内で入力してください");
  }
  return {
    roomCode: currentRoomCode,
    title: trimmedTitle,
  };
}
