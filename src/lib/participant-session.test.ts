import { describe, expect, it } from "vitest";
import {
  isParticipantSession,
  parseParticipantSession,
  participantStorageKey,
  readParticipantSession,
} from "@/lib/participant-session";

class MemoryStorage {
  private values = new Map<string, string>();
  removed: string[] = [];

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removed.push(key);
    this.values.delete(key);
  }
}

describe("participant session", () => {
  it("正しい参加者セッションだけ復元する", () => {
    const session = {
      participantId: "p1",
      participantToken: "token",
      name: "ゲスト",
      score: 120,
    };

    expect(isParticipantSession(session)).toBe(true);
    expect(parseParticipantSession(JSON.stringify(session))).toEqual({
      ...session,
      avatarUrl: null,
    });
    expect(
      parseParticipantSession(
        JSON.stringify({
          ...session,
          avatarUrl: "https://example.com/avatar.png",
        }),
      ),
    ).toEqual({
      ...session,
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(parseParticipantSession("{broken")).toBeNull();
    expect(parseParticipantSession(JSON.stringify({ participantId: "p1" }))).toBeNull();
  });

  it("壊れたlocalStorage値は削除して復旧する", () => {
    const storage = new MemoryStorage();
    const key = participantStorageKey("ROOM");
    storage.setItem(key, "{broken");

    expect(readParticipantSession(storage, key)).toBeNull();
    expect(storage.removed).toEqual([key]);
  });
});
