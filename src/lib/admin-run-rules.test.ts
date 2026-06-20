import { describe, expect, it } from "vitest";
import { resetRunState, updateEventTitle } from "@/lib/admin-run-rules";

describe("admin run rules", () => {
  it("イベント名を更新してもroomCodeは変えない", () => {
    expect(updateEventTitle("ROOM24", "  二次会クイズ  ")).toEqual({
      roomCode: "ROOM24",
      title: "二次会クイズ",
    });
    expect(() => updateEventTitle("ROOM24", " ")).toThrow("イベント名を入力してください");
  });

  it("リセットしてもquestionsとbasePointsは消さず、answersとscoreだけ初期化する", () => {
    const state = resetRunState({
      questions: [
        { id: "q1", basePoints: 50 },
        { id: "q2", basePoints: 300 },
      ],
      answers: [{ id: "answer-1" }],
      participants: [
        { id: "p1", score: 420 },
        { id: "p2", score: 80 },
      ],
      liveState: {
        phase: "finished",
        currentQuestionId: "q2",
        questionStartedAt: "2026-06-20T10:00:00Z",
      },
      eventStatus: "finished",
    });

    expect(state.questions).toEqual([
      { id: "q1", basePoints: 50 },
      { id: "q2", basePoints: 300 },
    ]);
    expect(state.answers).toEqual([]);
    expect(state.participants).toEqual([
      { id: "p1", score: 0 },
      { id: "p2", score: 0 },
    ]);
    expect(state.liveState).toEqual({
      phase: "lobby",
      currentQuestionId: null,
      questionStartedAt: null,
    });
    expect(state.eventStatus).toBe("waiting");
  });
});
