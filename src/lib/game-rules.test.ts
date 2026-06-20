import { describe, expect, it } from "vitest";
import {
  QuizRuleError,
  assertAdminKeyMatches,
  evaluateSubmitAnswer,
  nextPhaseForAdminAction,
  type SubmitAnswerRuleInput,
} from "@/lib/game-rules";

const startedAtMs = 1_000_000;

function baseInput(overrides: Partial<SubmitAnswerRuleInput> = {}): SubmitAnswerRuleInput {
  return {
    eventId: "event-1",
    eventStatus: "playing",
    participant: {
      id: "participant-1",
      eventId: "event-1",
      participantToken: "token-1",
      score: 200,
    },
    participantToken: "token-1",
    question: {
      id: "question-1",
      eventId: "event-1",
      correctIndex: 2,
      timeLimitSec: 10,
    },
    liveState: {
      phase: "question",
      currentQuestionId: "question-1",
      questionStartedAtMs: startedAtMs,
    },
    selectedIndex: 2,
    existingAnswers: [],
    nowMs: startedAtMs + 1800,
    ...overrides,
  };
}

describe("submit_answer rules", () => {
  it("正解回答をサーバー時刻差分で採点する", () => {
    expect(evaluateSubmitAnswer(baseInput())).toMatchObject({
      responseMs: 1800,
      isCorrect: true,
      point: 150,
      nextScore: 350,
    });
  });

  it("二重回答を拒否してscore二重加算を防ぐ", () => {
    expect(() =>
      evaluateSubmitAnswer(
        baseInput({
          existingAnswers: [{ questionId: "question-1", participantId: "participant-1" }],
        }),
      ),
    ).toThrow("すでに回答済みです");
  });

  it("締切後回答を拒否する", () => {
    expect(() =>
      evaluateSubmitAnswer(baseInput({ nowMs: startedAtMs + 10_001 })),
    ).toThrow("回答時間を過ぎています");
  });

  it("不正participantとtoken不一致を拒否する", () => {
    expect(() => evaluateSubmitAnswer(baseInput({ participant: null }))).toThrow(
      "参加情報を確認できません",
    );
    expect(() => evaluateSubmitAnswer(baseInput({ participantToken: "wrong" }))).toThrow(
      "参加情報を確認できません",
    );
  });

  it("question以外のphaseでは回答できない", () => {
    expect(() =>
      evaluateSubmitAnswer(baseInput({ liveState: { ...baseInput().liveState, phase: "closed" } })),
    ).toThrow("現在は回答受付中ではありません");
  });

  it("不正解は0点でscoreを増やさない", () => {
    expect(evaluateSubmitAnswer(baseInput({ selectedIndex: 1 }))).toMatchObject({
      isCorrect: false,
      point: 0,
      nextScore: 200,
    });
  });
});

describe("admin rules", () => {
  it("adminKey不一致を拒否する", () => {
    expect(() => assertAdminKeyMatches("wrong", "expected")).toThrow(QuizRuleError);
  });

  it("phase遷移を順序どおりに制限する", () => {
    expect(nextPhaseForAdminAction("lobby", "start_question")).toBe("question");
    expect(nextPhaseForAdminAction("question", "close_question")).toBe("closed");
    expect(nextPhaseForAdminAction("closed", "reveal_answer")).toBe("answer");
    expect(nextPhaseForAdminAction("answer", "show_ranking")).toBe("ranking");
    expect(() => nextPhaseForAdminAction("question", "reveal_answer")).toThrow(
      "先に回答を締め切ってください",
    );
  });
});
