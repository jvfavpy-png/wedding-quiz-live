import { describe, expect, it } from "vitest";
import { hasRehearsalResults, shouldConfirmBeforeStart } from "@/lib/rehearsal-status";

describe("rehearsal status", () => {
  it("回答または得点が残っていればリハーサル結果ありと判定する", () => {
    expect(
      hasRehearsalResults({
        totalAnswerCount: 1,
        scoredParticipantCount: 0,
        phase: "lobby",
        eventStatus: "waiting",
      }),
    ).toBe(true);
    expect(
      hasRehearsalResults({
        totalAnswerCount: 0,
        scoredParticipantCount: 1,
        phase: "lobby",
        eventStatus: "waiting",
      }),
    ).toBe(true);
    expect(
      hasRehearsalResults({
        totalAnswerCount: 0,
        scoredParticipantCount: 0,
        phase: "lobby",
        eventStatus: "waiting",
      }),
    ).toBe(false);
  });

  it("本番開始前に確認すべき状態を判定する", () => {
    expect(
      shouldConfirmBeforeStart({
        totalAnswerCount: 0,
        scoredParticipantCount: 0,
        phase: "lobby",
        eventStatus: "waiting",
      }),
    ).toBe(false);
    expect(
      shouldConfirmBeforeStart({
        totalAnswerCount: 0,
        scoredParticipantCount: 0,
        phase: "answer",
        eventStatus: "playing",
      }),
    ).toBe(true);
    expect(
      shouldConfirmBeforeStart({
        totalAnswerCount: 0,
        scoredParticipantCount: 0,
        phase: "finished",
        eventStatus: "finished",
      }),
    ).toBe(true);
  });
});
