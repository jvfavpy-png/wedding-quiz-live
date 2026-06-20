import type { ParticipantSession } from "@/types/quiz";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createParticipantToken(): string {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${randomId}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function participantStorageKey(roomCode: string): string {
  return `wedding-quiz-live:${roomCode}:participant`;
}

export function isParticipantSession(value: unknown): value is ParticipantSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.participantId === "string" &&
    typeof record.participantToken === "string" &&
    typeof record.name === "string" &&
    typeof record.score === "number"
  );
}

export function parseParticipantSession(raw: string | null): ParticipantSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isParticipantSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readParticipantSession(
  storage: StorageLike | null,
  key: string,
): ParticipantSession | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);
  const session = parseParticipantSession(raw);
  if (!session && raw) {
    storage.removeItem(key);
  }

  return session;
}
