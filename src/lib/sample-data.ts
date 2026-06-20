import type { AdminQuestion } from "@/types/quiz";

export const sampleQuestions: Array<Omit<AdminQuestion, "id">> = [
  {
    orderNo: 1,
    text: "新郎新婦が初めて出会った場所は？",
    options: ["職場", "友人の紹介", "マッチングアプリ", "旅行先"],
    correctIndex: 1,
    timeLimitSec: 10,
  },
  {
    orderNo: 2,
    text: "新郎が新婦に初めてプレゼントしたものは？",
    options: ["花", "アクセサリー", "お菓子", "手紙"],
    correctIndex: 2,
    timeLimitSec: 10,
  },
  {
    orderNo: 3,
    text: "新婦が新郎に直してほしいと思っていることは？",
    options: ["寝落ち", "返信の速さ", "服の脱ぎっぱなし", "食べすぎ"],
    correctIndex: 2,
    timeLimitSec: 10,
  },
  {
    orderNo: 4,
    text: "新郎新婦が一番思い出に残っている旅行先は？",
    options: ["北海道", "九州", "沖縄", "関西"],
    correctIndex: 2,
    timeLimitSec: 10,
  },
  {
    orderNo: 5,
    text: "新郎新婦が将来一番大事にしたいことは？",
    options: ["お金", "健康", "笑い", "家族時間"],
    correctIndex: 3,
    timeLimitSec: 10,
  },
];
