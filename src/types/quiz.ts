export type EventStatus = "waiting" | "playing" | "finished";

export type Phase =
  | "lobby"
  | "question"
  | "closed"
  | "answer"
  | "ranking"
  | "finished";

export type AdminAction =
  | "start_question"
  | "close_question"
  | "reveal_answer"
  | "show_ranking"
  | "finish_event"
  | "reset_run"
  | "reopen_event";

export type QuestionDifficulty = "easy" | "normal" | "hard" | "special" | "final";

export interface PublicEvent {
  id: string;
  title: string;
  roomCode: string;
  status: EventStatus;
}

export interface LiveState {
  eventId: string;
  currentQuestionId: string | null;
  phase: Phase;
  questionStartedAt: string | null;
  updatedAt: string;
}

export interface PublicQuestion {
  id: string;
  orderNo: number;
  text: string;
  options: [string, string, string, string];
  correctIndex: number | null;
  timeLimitSec: number;
  difficulty: QuestionDifficulty;
  basePoints: number;
  speedBonusEnabled: boolean;
}

export interface AdminQuestion extends Omit<PublicQuestion, "correctIndex"> {
  correctIndex: number;
}

export interface RoomSnapshot {
  event: PublicEvent;
  liveState: LiveState;
  currentQuestion: PublicQuestion | null;
  participantCount: number;
  totalAnswerCount: number;
  serverNow: string;
}

export interface AnswerDistribution {
  questionId: string | null;
  options: string[];
  counts: [number, number, number, number];
  total: number;
  correctIndex: number | null;
}

export interface RankingEntry {
  rank: number;
  participantId: string;
  name: string;
  score: number;
}

export interface ParticipantSession {
  participantId: string;
  participantToken: string;
  name: string;
  score: number;
}

export interface MyAnswer {
  questionId: string;
  selectedIndex: number;
  responseMs: number;
  isCorrect: boolean | null;
  point: number | null;
  basePoints: number | null;
  speedBonus: number | null;
  totalScore: number | null;
}

export interface AdminSnapshot {
  event: PublicEvent;
  liveState: LiveState;
  questions: AdminQuestion[];
  participantCount: number;
  totalAnswerCount: number;
  scoredParticipantCount: number;
  hasRehearsalResults: boolean;
  distribution: AnswerDistribution;
  ranking: RankingEntry[];
  serverNow: string;
}

export interface CreatedEvent {
  event: PublicEvent;
  adminUrl: string;
  joinUrl: string;
  screenUrl: string;
}

export interface ApiErrorBody {
  error: string;
}
