import { describe, expect, it } from "vitest";
import { rankParticipants } from "@/lib/ranking";

describe("ranking", () => {
  it("score降順、同点は参加順でランキングを出す", () => {
    expect(
      rankParticipants([
        { id: "late", name: "同点後", score: 100, joinedAt: "2026-01-01T00:00:02Z" },
        { id: "top", name: "トップ", score: 200, joinedAt: "2026-01-01T00:00:03Z" },
        { id: "early", name: "同点先", score: 100, joinedAt: "2026-01-01T00:00:01Z" },
      ]).map((entry) => ({ id: entry.id, rank: entry.rank })),
    ).toEqual([
      { id: "top", rank: 1 },
      { id: "early", rank: 2 },
      { id: "late", rank: 3 },
    ]);
  });
});
