export type EventStatus = "waiting" | "playing" | "finished";

export type EventRunMode = "rehearsal" | "production";

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

export type DesignThemeId =
  | "classic_bridal"
  | "garden_wedding"
  | "quiz_show"
  | "minimal_white"
  | "night_party";

export type SoundPackId =
  | "elegant_wedding"
  | "quiz_show_classic"
  | "party_pop"
  | "minimal_clean"
  | "night_party"
  | "custom";

export type EffectStyleId = "minimal" | "standard" | "tv_show" | "party";

export type SoundKey =
  | "start"
  | "countdown"
  | "close"
  | "reveal"
  | "correct"
  | "wrong"
  | "ranking"
  | "winner"
  | "submit";

export interface SoundSettings {
  soundEnabled: boolean;
  visualEffectsEnabled: boolean;
  soundPack: SoundPackId;
  effectStyle: EffectStyleId;
  screenVolume: number;
  revealDelaySeconds: number;
  screenConfettiEnabled: boolean;
  guestSoundEnabled: boolean;
  guestEffectsEnabled: boolean;
}

export interface SoundAsset {
  soundKey: SoundKey;
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  updatedAt: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  roomCode: string;
  status: EventStatus;
  designTheme: DesignThemeId;
  runMode: EventRunMode;
  sound: SoundSettings;
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
  imageUrl: string | null;
  optionImageUrls: [string | null, string | null, string | null, string | null];
  correctIndex: number | null;
  timeLimitSec: number;
  difficulty: QuestionDifficulty;
  basePoints: number;
  speedBonusEnabled: boolean;
}

export interface AdminQuestion extends Omit<PublicQuestion, "correctIndex"> {
  correctIndex: number;
  presenterNote: string | null;
}

export interface RoomSnapshot {
  event: PublicEvent;
  liveState: LiveState;
  currentQuestion: PublicQuestion | null;
  participantCount: number;
  totalAnswerCount: number;
  serverNow: string;
  soundAssets: SoundAsset[];
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
  avatarUrl: string | null;
}

export interface AdminParticipant {
  participantId: string;
  name: string;
  score: number;
  answerCount: number;
  joinedAt: string;
  lastSeenAt: string;
  avatarUrl: string | null;
  duplicateNameCount: number;
}

export interface ParticipantSession {
  participantId: string;
  participantToken: string;
  name: string;
  score: number;
  avatarUrl: string | null;
  duplicateNameCount?: number;
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
  participants: AdminParticipant[];
  serverNow: string;
  soundAssets: SoundAsset[];
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
